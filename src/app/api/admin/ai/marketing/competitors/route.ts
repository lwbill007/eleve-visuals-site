import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { upsertCompetitorProfile } from "@/lib/ai/marketing";
import type { CompetitorProfile } from "@/lib/ai/marketing/types";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const profile = await upsertCompetitorProfile(body as Omit<CompetitorProfile, "id" | "lastUpdatedAt" | "memoryId">);
  return NextResponse.json({ ok: true, profile });
}
