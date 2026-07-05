import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getExecutiveIntelligence } from "@/lib/ai/intelligence/executive-intelligence";
import { getAIDailyBriefing } from "@/lib/ai/intelligence/daily-briefing";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const section = new URL(request.url).searchParams.get("section");

  if (section === "briefing") {
    const briefing = await getAIDailyBriefing(force);
    return NextResponse.json({ briefing });
  }

  const intelligence = await getExecutiveIntelligence(force);
  return NextResponse.json(intelligence);
}
