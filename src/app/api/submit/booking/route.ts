import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recordConversion } from "@/lib/analytics-server";
import { getBookingOptions, getSiteConfig } from "@/lib/content";
import { formatInquiryId } from "@/lib/booking";
import {
  bookingConfirmationEmail,
  bookingNotificationEmail,
  sendEmail,
} from "@/lib/email";
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

  const spam = await runSpamChecks(body);
  if (spam.isSpam) {
    if (spam.silent) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: spam.message ?? "Submission rejected" }, { status: 400 });
  }

  const bookingOptions = await getBookingOptions();
  const cleaned = stripSpamFields(body);
  const parsed = createBookingSchema(bookingOptions).safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let inquiryId: string;
  try {
    const submission = await prisma.submission.create({
      data: {
        type: "booking",
        data: JSON.stringify(parsed.data),
        status: "new",
      },
    });
    inquiryId = submission.id;
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
    const siteConfig = await getSiteConfig();
    const displayId = formatInquiryId(inquiryId);
    const adminUrl = `${siteConfig.url || process.env.NEXT_PUBLIC_SITE_URL || ""}/admin/submissions?type=booking`;

    if (siteConfig.email) {
      const adminMail = bookingNotificationEmail({
        name: parsed.data.fullName,
        email: parsed.data.email,
        services: parsed.data.serviceTypes.join(", "),
        preferredDate: parsed.data.preferredDate,
        inquiryId: displayId,
        adminUrl,
      });
      await sendEmail({
        to: siteConfig.email,
        subject: adminMail.subject,
        html: adminMail.html,
        replyTo: parsed.data.email,
      });
    }

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
  } catch (error) {
    console.error("Booking notification failed:", error);
  }

  return NextResponse.json({ ok: true, inquiryId });
}
