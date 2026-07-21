import { NextResponse } from "next/server";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordConversion } from "@/lib/analytics-server";
import { getBookingOptions, getNotificationSettings, getSiteConfig } from "@/lib/content";
import { formatInquiryId } from "@/lib/booking";
import { bookingConfirmationEmail, sendEmail } from "@/lib/email";
import { notifyNewSubmission } from "@/lib/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runSpamChecks, stripSpamFields } from "@/lib/spam";
import { createBookingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "submit:booking");
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

  const bookingOptions = await getBookingOptions();
  const cleaned = stripSpamFields(body);
  const idempotencyKey =
    typeof cleaned.idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(cleaned.idempotencyKey)
      ? cleaned.idempotencyKey
      : null;
  const { normalizeBookingPayload } = await import("@/lib/booking");
  const normalized = normalizeBookingPayload(cleaned, bookingOptions);
  const parsed = createBookingSchema(bookingOptions).safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { qualifyInquiry } = await import("@/lib/booking-qualification");
  const qualification = qualifyInquiry({
    packageId: parsed.data.packageId,
    addOnIds: parsed.data.addOnIds ?? [],
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    instagram: parsed.data.instagram,
    website: parsed.data.website,
    businessName: parsed.data.businessName,
    purpose: parsed.data.purpose,
    goals: parsed.data.goals,
    audience: parsed.data.audience,
    creativeDirection: parsed.data.creativeDirection,
    projectVision: parsed.data.projectVision,
    preferredDate: parsed.data.preferredDate,
    location: parsed.data.location,
    referralSource: parsed.data.referralSource,
    pinterestLink: parsed.data.pinterestLink,
    moodBoardUrl: parsed.data.moodBoardUrl,
    driveLink: parsed.data.driveLink,
    feelingPrompt: parsed.data.feelingPrompt,
    inspirationPrompt: parsed.data.inspirationPrompt,
    projectCategory: parsed.data.projectCategory,
  });

  const submissionData = {
    ...parsed.data,
    qualification,
  };

  let inquiryId: string;
  try {
    const submission = await prisma.submission.create({
      data: {
        type: "booking",
        idempotencyKey,
        data: JSON.stringify(submissionData),
        status: "lead",
        ipAddress: ip,
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 1000),
        contactEmail: parsed.data.email.trim().toLowerCase(),
      },
    });
    inquiryId = submission.id;
  } catch (error) {
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
        return NextResponse.json({ ok: true, inquiryId: existing.id, deduplicated: true });
      }
    }
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  const referer = request.headers.get("referer") ?? undefined;
  const sessionId = typeof body._sessionId === "string" ? body._sessionId : undefined;
  const path = referer ? new URL(referer).pathname : "/book";
  after(async () => {
    const tasks: Promise<unknown>[] = [
      recordConversion("booking", path, referer ?? null, sessionId),
      notifyNewSubmission({
        formType: "booking",
        submissionId: inquiryId,
        data: submissionData as Record<string, unknown>,
      }),
      (async () => {
        const [siteConfig, notificationSettings] = await Promise.all([
          getSiteConfig(),
          getNotificationSettings(),
        ]);
        if (!notificationSettings.sendApplicantConfirmation) return;
        const confirmMail = bookingConfirmationEmail({
          name: parsed.data.fullName,
          inquiryId: formatInquiryId(inquiryId),
        });
        await sendEmail({
          to: parsed.data.email,
          subject: confirmMail.subject,
          html: confirmMail.html,
          replyTo: siteConfig.email,
        });
      })(),
      (async () => {
        const { emitBusinessEvent } = await import("@/lib/ai/platform/business-events");
        await emitBusinessEvent({
          type: "booking_created",
          entityId: inquiryId,
          entityType: "submission",
          payload: { type: "booking" },
          source: "booking_form",
        });
      })(),
    ];
    const results = await Promise.allSettled(tasks);
    for (const result of results) {
      if (result.status === "rejected") console.error("Booking follow-up failed:", result.reason);
    }
    const [{ triggerIntelligenceRefreshBackground }, { generateBookingProductionIntelBackground }] =
      await Promise.all([
        import("@/lib/ai/memory/knowledge/trigger"),
        import("@/lib/ai/intelligence/booking-production-brief"),
      ]);
    triggerIntelligenceRefreshBackground("booking_received");
    generateBookingProductionIntelBackground(inquiryId, submissionData);
  });

  return NextResponse.json({ ok: true, inquiryId });
}
