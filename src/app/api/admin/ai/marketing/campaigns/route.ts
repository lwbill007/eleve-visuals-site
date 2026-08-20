import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { registerCampaign, updateCampaignMetrics } from "@/lib/ai/marketing";
import type { RegisterCampaignInput } from "@/lib/ai/marketing/types";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:marketing-campaigns");
  if (blocked) return blocked;

  const body = await req.json();
  const campaign = await registerCampaign(body as RegisterCampaignInput);
  return NextResponse.json({ ok: true, campaign });
}

export async function PATCH(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, metrics, lessonsLearned } = body as {
    id: string;
    metrics?: Record<string, number>;
    lessonsLearned?: string[];
  };

  if (!id) return NextResponse.json({ error: "Campaign id required" }, { status: 400 });

  const updated = await updateCampaignMetrics(id, metrics ?? {}, lessonsLearned);
  if (!updated) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  return NextResponse.json({ ok: true, campaign: updated });
}
