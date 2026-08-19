import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyBookingAccessToken } from "@/lib/booking-access-token";
import { createDepositCheckoutSession, isStripeConfigured } from "@/lib/stripe-client";
import { getPackageById } from "@/lib/booking-packages";
import { VERIFIED_SETTLED_PAYMENT_WHERE } from "@/lib/payments";

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request);
  const rate = await checkRateLimit(ip, "booking:deposit-session");
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many attempts — try again later." }, { status: 429 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Online payment is not configured." }, { status: 503 });
  }

  const submissionId = await verifyBookingAccessToken(token);
  if (!submissionId) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const existingDeposit = await prisma.payment.findFirst({
    where: { ...VERIFIED_SETTLED_PAYMENT_WHERE, submissionId },
  });
  if (existingDeposit) {
    return NextResponse.json({ error: "A deposit has already been paid for this booking." }, { status: 409 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const pkg = getPackageById(asString(data.packageId) || "");
  const origin = new URL(request.url).origin;

  try {
    const url = await createDepositCheckoutSession({
      submissionId,
      clientName: asString(data.fullName) || "Client",
      packageName: pkg?.name || asString(data.packageId) || "ÉLEVÉ Experience",
      clientEmail: submission.contactEmail || asString(data.email) || undefined,
      data,
      successUrl: `${origin}/b/${token}?paid=1`,
      cancelUrl: `${origin}/b/${token}`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[deposit-session] failed:", submissionId, error);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
