import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  runExecutiveResearch,
  getContinuousIntelligenceStatus,
  listRecentResearch,
  recordResearchDecision,
  KNOWLEDGE_PRIORITY_ORDER,
  RESEARCH_CATEGORIES,
  AUTO_SEARCH_TRIGGERS,
  RESEARCH_MODE_META,
  SOURCE_PROFILE_CATALOG,
  type ResearchMode,
} from "@/lib/ai/research";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [monitor, recent] = await Promise.all([
    getContinuousIntelligenceStatus(),
    listRecentResearch(8),
  ]);

  return NextResponse.json({
    version: 2,
    division: "ÉLEVÉ OS Executive Research Division",
    knowledgePriority: KNOWLEDGE_PRIORITY_ORDER,
    categories: RESEARCH_CATEGORIES,
    autoSearchTriggers: AUTO_SEARCH_TRIGGERS,
    modes: RESEARCH_MODE_META,
    sourceProfiles: SOURCE_PROFILE_CATALOG,
    monitor,
    recent,
  });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    query?: string;
    mode?: ResearchMode;
    forceExternal?: boolean;
    internalSufficient?: boolean;
    persist?: boolean;
    decision?: {
      researchId: string;
      decision: "accepted" | "rejected" | "deferred";
      note?: string;
      outcome?: string;
    };
  };

  if (body.decision) {
    await recordResearchDecision(body.decision);
    return NextResponse.json({ ok: true });
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const report = await runExecutiveResearch({
    query: body.query.trim(),
    mode: body.mode,
    forceExternal: body.forceExternal,
    internalSufficient: body.internalSufficient,
    persist: body.persist !== false,
  });

  return NextResponse.json(report);
}
