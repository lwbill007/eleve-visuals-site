import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBookingIntelligence } from "@/lib/ai/intelligence/bookings";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const intel = await getBookingIntelligence(force);
  return NextResponse.json(intel);
}
