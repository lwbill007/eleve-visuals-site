import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { completeMission } from "@/lib/ai/executive/mission-control";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    missionId: string;
    title: string;
    worked: boolean;
    revenueImpact?: number;
    bookingsImpact?: number;
    notes?: string;
  };

  if (!body.missionId || !body.title) {
    return NextResponse.json({ error: "missionId and title required" }, { status: 400 });
  }

  const result = await completeMission(body);
  await invalidateIntelligenceCaches();
  return NextResponse.json(result);
}
