import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildWebsiteIntelligenceEngine } from "@/lib/ai/intelligence/website-engine";
import { runOrchestrator } from "@/lib/ai/orchestrator";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const engine = await buildWebsiteIntelligenceEngine();

  let audit = null;
  if (refresh) {
    try {
      const orch = await runOrchestrator({ taskKind: "website_seo" });
      audit = orch.audit;
    } catch {
      /* non-blocking */
    }
  }

  return NextResponse.json({ ...engine, audit });
}
