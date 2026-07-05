import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAIDailyBriefing } from "@/lib/ai/intelligence/daily-briefing";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const briefing = await getAIDailyBriefing(force);
  return NextResponse.json(briefing);
}
