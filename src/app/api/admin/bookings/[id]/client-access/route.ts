import { NextResponse } from "next/server";
import { requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBookingAccessToken } from "@/lib/booking-access-token";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Mints a 30-day token capable of triggering a real Stripe checkout — bare requireAdmin()
    // would let a viewer-level credential do this, so require at least operator.
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const submission = await prisma.submission.findUnique({ where: { id }, select: { id: true } });
  if (!submission) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const token = await createBookingAccessToken(id);
  const url = new URL(`/b/${token}`, request.url).toString();

  return NextResponse.json({ url });
}
