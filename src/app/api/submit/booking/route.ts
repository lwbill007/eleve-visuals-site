import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordConversion } from "@/lib/analytics-server";
import { getBookingOptions, getNotificationSettings, getSiteConfig } from "@/lib/content";
import { formatInquiryId } from "@/lib/booking";
import { bookingConfirmationEmail, sendEmail } from "@/lib/email";
import { notifyNewSubmission } from "@/lib/notifications";
import { checkRateLimit, consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { runSpamChecks, stripSpamFields } from "@/lib/spam";
import { createBookingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "submit:booking", { consume: false });
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

  const bookingOptions = await getBookingOptions();
  const cleaned = stripSpamFields(body);
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
        data: JSON.stringify(submissionData),
        status: "lead",
        ipAddress: ip,
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 1000),
        contactEmail: parsed.data.email.trim().toLowerCase(),
      },
    });
    inquiryId = submission.id;
    await consumeRateLimit(ip, "submit:booking");
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  try {
    const referer = request.headers.get("referer") ?? undefined;
    const sessionId = typeof body._sessionId === "string" ? body._sessionId : undefined;
    const path = referer ? new URL(referer).pathname : "/book";
    await recordConversion("booking", path, referer ?? null, sessionId);
  } catch (error) {
    console.error("Conversion tracking failed:", error);
  }

  try {
    await notifyNewSubmission({
      formType: "booking",
      submissionId: inquiryId,
      data: submissionData as Record<string, unknown>,
    });
  } catch (error) {
    console.error("Booking notification failed:", error);
  }

  try {
    const [siteConfig, notificationSettings] = await Promise.all([
      getSiteConfig(),
      getNotificationSettings(),
    ]);

    if (notificationSettings.sendApplicantConfirmation) {
      const displayId = formatInquiryId(inquiryId);
      const confirmMail = bookingConfirmationEmail({
        name: parsed.data.fullName,
        inquiryId: displayId,
      });
      await sendEmail({
        to: parsed.data.email,
        subject: confirmMail.subject,
        html: confirmMail.html,
        replyTo: siteConfig.email,
      });
    }
  } catch (error) {
    console.error("Booking confirmation email failed:", error);
  }

  const { emitBusinessEvent } = await import("@/lib/ai/platform/business-events");
  await emitBusinessEvent({
    type: "booking_created",
    entityId: inquiryId,
    entityType: "submission",
    payload: { type: "booking" },
    source: "booking_form",
  });

  const { triggerIntelligenceRefreshBackground } = await import("@/lib/ai/memory/knowledge/trigger");
  triggerIntelligenceRefreshBackground("booking_received");

  const { generateBookingProductionIntelBackground } = await import(
    "@/lib/ai/intelligence/booking-production-brief"
  );
  generateBookingProductionIntelBackground(inquiryId, submissionData);

  return NextResponse.json({ ok: true, inquiryId });
}
