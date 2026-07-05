import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBookingIntelligence } from "@/lib/ai/intelligence/bookings";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const intel = await getBookingIntelligence();
  return NextResponse.json(intel);
}
