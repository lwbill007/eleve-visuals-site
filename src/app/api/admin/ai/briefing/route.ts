import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAIBriefing } from "@/lib/ai/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const briefing = await getAIBriefing(force);
  return NextResponse.json(briefing);
}
