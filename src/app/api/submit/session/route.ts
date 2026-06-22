import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordConversion } from "@/lib/analytics-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runSpamChecks, stripSpamFields } from "@/lib/spam";
import { createSessionApplicationSchema } from "@/lib/session-application-validation";
import {
  getSessionVolumeForApplication,
  hasDuplicateApplication,
  validateSessionApplicationGate,
  maybeAutoCloseVolume,
} from "@/lib/session-application-server";
import { parseApplicationSettings, toLegacyApplicationFields } from "@/lib/session-application";
import {
  sendEmail,
  applicationNotificationEmail,
  applicantConfirmationEmail,
} from "@/lib/email";
import { getSiteConfig } from "@/lib/content";
import { formatApplicationId } from "@/lib/session-application";

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

  const spam = await runSpamChecks(body);
  if (spam.isSpam) {
    if (spam.silent) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: spam.message ?? "Submission rejected" }, { status: 400 });
  }

  const cleaned = stripSpamFields(body);
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
  if (await hasDuplicateApplication(volumeId, email)) {
    return NextResponse.json(
      { error: "An application with this email already exists for this session." },
      { status: 409 }
    );
  }

  const legacy = toLegacyApplicationFields(parsed.data);
  const payload = {
    ...parsed.data,
    ...legacy,
    sessionVolumeSlug: volume.slug,
    sessionVolumeTitle: volume.title,
  };

  let applicationId: string;
  try {
    const submission = await prisma.submission.create({
      data: {
        type: "session",
        data: JSON.stringify(payload),
        status: "pending_review",
        sessionVolumeId: volumeId,
      },
    });
    applicationId = submission.id;
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  try {
    const referer = request.headers.get("referer") ?? undefined;
    const path = referer ? new URL(referer).pathname : `/sessions/${volume.slug}/apply`;
    await recordConversion("session", path, referer ?? null);
  } catch (error) {
    console.error("Conversion tracking failed:", error);
  }

  try {
    const siteConfig = await getSiteConfig();
    const adminUrl = `${siteConfig.url || process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/applications`;
    const displayId = formatApplicationId(applicationId);

    if (settings.notifyAdminOnSubmission && siteConfig.email) {
      const adminMail = applicationNotificationEmail({
        applicantName: parsed.data.fullName,
        volumeTitle: volume.title,
        volumeNumber: volume.volumeNumber,
        applicationId: displayId,
        adminUrl,
      });
      await sendEmail({
        to: siteConfig.email,
        subject: adminMail.subject,
        html: adminMail.html,
        replyTo: parsed.data.email,
      });
    }

    if (settings.notifyApplicantOnSubmission) {
      const message =
        settings.customConfirmationMessage ||
        settings.emailTemplates.submissionConfirmation;
      const mail = applicantConfirmationEmail({
        name: parsed.data.fullName,
        volumeTitle: volume.title,
        applicationId: displayId,
        message,
      });
      await sendEmail({
        to: parsed.data.email,
        subject: mail.subject,
        html: mail.html,
        replyTo: siteConfig.email,
      });
    }
  } catch (error) {
    console.error("Application notification failed:", error);
  }

  await maybeAutoCloseVolume(volumeId, settings, volume.applicationDeadline);

  return NextResponse.json({ ok: true, inquiryId: applicationId, applicationId });
}
