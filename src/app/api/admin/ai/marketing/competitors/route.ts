import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { upsertCompetitorProfile } from "@/lib/ai/marketing";
import type { CompetitorProfile } from "@/lib/ai/marketing/types";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:marketing-competitors");
  if (blocked) return blocked;

  const body = await req.json();
  const profile = await upsertCompetitorProfile(body as Omit<CompetitorProfile, "id" | "lastUpdatedAt" | "memoryId">);
  return NextResponse.json({ ok: true, profile });
}
