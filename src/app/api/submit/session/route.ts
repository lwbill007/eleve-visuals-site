import { NextResponse } from "next/server";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordConversion } from "@/lib/analytics-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runSpamChecks, stripSpamFields } from "@/lib/spam";
import { createSessionApplicationSchema } from "@/lib/session-application-validation";
import {
  getSessionVolumeForApplication,
  validateSessionApplicationGate,
  maybeAutoCloseVolume,
} from "@/lib/session-application-server";
import { parseApplicationSettings, toLegacyApplicationFields } from "@/lib/session-application";
import { sendEmail, applicantConfirmationEmail } from "@/lib/email";
import { notifyNewSubmission } from "@/lib/notifications";
import { getSiteConfig } from "@/lib/content";
import { formatApplicationId } from "@/lib/session-application";
import {
  hashSessionUploadToken,
  verifySessionUploadToken,
} from "@/lib/session-upload-token";
import {
  applicantMediaId,
  applicantMediaUrl,
} from "@/lib/session-private-media";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "submit:session");
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const spam = await runSpamChecks(body, request);
  if (spam.isSpam) {
    if (spam.silent) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: spam.message ?? "Submission rejected" }, { status: 400 });
  }

  const cleaned = stripSpamFields(body);
  const idempotencyKey =
    typeof cleaned.idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(cleaned.idempotencyKey)
      ? cleaned.idempotencyKey
      : null;
  const uploadToken = typeof cleaned.uploadToken === "string" ? cleaned.uploadToken : "";
  const volumeId = typeof cleaned.sessionVolumeId === "string" ? cleaned.sessionVolumeId : "";
  if (!volumeId) {
    return NextResponse.json({ error: "Session volume is required" }, { status: 400 });
  }

  const volume = await getSessionVolumeForApplication(volumeId);
  if (!volume) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const settings = parseApplicationSettings(volume.applicationSettings);
  const gate = await validateSessionApplicationGate(volume);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: 403 });
  }

  const schema = createSessionApplicationSchema({
    requirePortfolioUpload: settings.requirePortfolioUpload,
    requireRoleSelection: settings.requireRoleSelection,
    questions: settings.questions,
  });

  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (
    parsed.data.portfolioImages.length > 0 &&
    !(await verifySessionUploadToken(uploadToken, volumeId))
  ) {
    return NextResponse.json({ error: "Portfolio upload authorization expired" }, { status: 401 });
  }

  const mediaIds = parsed.data.portfolioImages
    .map(applicantMediaId)
    .filter((id): id is string => Boolean(id));
  if (mediaIds.length !== parsed.data.portfolioImages.length) {
    return NextResponse.json({ error: "Invalid portfolio upload reference" }, { status: 400 });
  }
  if (mediaIds.length > 0) {
    const ownedAssetCount = await prisma.mediaAsset.count({
      where: {
        id: { in: mediaIds },
        purpose: "session-application",
        uploadTokenHash: hashSessionUploadToken(uploadToken),
      },
    });
    if (ownedAssetCount !== mediaIds.length) {
      return NextResponse.json({ error: "Portfolio upload authorization failed" }, { status: 401 });
    }
  }

  const cleanPortfolioImages = mediaIds.map((id) =>
    applicantMediaUrl(new URL(request.url).origin, id)
  );
  const legacy = toLegacyApplicationFields(parsed.data);
  const payload = {
    ...parsed.data,
    portfolioImages: cleanPortfolioImages,
    ...legacy,
    sessionVolumeSlug: volume.slug,
    sessionVolumeTitle: volume.title,
  };

  const initialStatus = gate.waitlist ? "waitlisted" : "pending_review";

  let applicationId: string;
  let deduplicated = false;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${volumeId}:${email}`}))`
        );
        const existing = await tx.submission.findFirst({
          where: {
            OR: [
              ...(idempotencyKey ? [{ idempotencyKey }] : []),
              { type: "session", sessionVolumeId: volumeId, contactEmail: email },
            ],
          },
          select: { id: true },
        });
        if (existing) return { id: existing.id, deduplicated: true };

        const submission = await tx.submission.create({
          data: {
            type: "session",
            idempotencyKey,
            data: JSON.stringify(payload),
            status: initialStatus,
            sessionVolumeId: volumeId,
            ipAddress: ip,
            userAgent: (request.headers.get("user-agent") ?? "").slice(0, 1000),
            contactEmail: email,
          },
        });
        if (uploadToken && mediaIds.length > 0) {
          const claimed = await tx.mediaAsset.updateMany({
            where: {
              id: { in: mediaIds },
              uploadTokenHash: hashSessionUploadToken(uploadToken),
              purpose: "session-application",
              claimedAt: null,
            },
            data: {
              claimedAt: new Date(),
              submissionId: submission.id,
            },
          });
          if (claimed.count !== mediaIds.length) {
            throw new Error("UPLOAD_CLAIM_FAILED");
          }
        }
        return { id: submission.id, deduplicated: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    applicationId = result.id;
    deduplicated = result.deduplicated;
  } catch (error) {
    if (error instanceof Error && error.message === "UPLOAD_CLAIM_FAILED") {
      return NextResponse.json(
        { error: "Portfolio uploads were already claimed or expired" },
        { status: 409 }
      );
    }
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.submission.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({
          ok: true,
          inquiryId: existing.id,
          applicationId: existing.id,
          deduplicated: true,
        });
      }
    }
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  if (!deduplicated) {
    const referer = request.headers.get("referer") ?? undefined;
    const path = referer ? new URL(referer).pathname : `/sessions/${volume.slug}/apply`;
    after(async () => {
      const results = await Promise.allSettled([
        recordConversion("session", path, referer ?? null),
        notifyNewSubmission({
          formType: "session",
          submissionId: applicationId,
          data: {
            ...payload,
            sessionVolumeTitle: volume.title,
          } as Record<string, unknown>,
        }),
        (async () => {
          const { emitBusinessEvent } = await import("@/lib/ai/platform/business-events");
          await emitBusinessEvent({
            type: "application_received",
            entityId: applicationId,
            entityType: "submission",
            payload: { volumeId, volumeSlug: volume.slug, email },
            source: "session_form",
          });
        })(),
        (async () => {
          if (!settings.notifyApplicantOnSubmission) return;
          const siteConfig = await getSiteConfig();
          const message = gate.waitlist
            ? settings.emailTemplates.waitlist
            : settings.customConfirmationMessage ||
              settings.emailTemplates.submissionConfirmation;
          const mail = applicantConfirmationEmail({
            name: parsed.data.fullName,
            volumeTitle: volume.title,
            applicationId: formatApplicationId(applicationId),
            message,
          });
          await sendEmail({
            to: parsed.data.email,
            subject: mail.subject,
            html: mail.html,
            replyTo: siteConfig.email,
          });
        })(),
        maybeAutoCloseVolume(volumeId, settings, volume.applicationDeadline),
      ]);
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Application follow-up failed:", result.reason);
        }
      }
    });
  }

  return NextResponse.json({
    ok: true,
    inquiryId: applicationId,
    applicationId,
    waitlist: gate.waitlist ?? false,
    deduplicated,
  });
}
