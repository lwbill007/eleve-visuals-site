import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshAndLearnBusinessKnowledge } from "@/lib/ai/memory/knowledge";
import { buildBusinessDNA } from "@/lib/ai/cognitive/business-dna";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const trigger = (body as { trigger?: string }).trigger ?? "manual";

  await invalidateIntelligenceCaches();

  const [report] = await Promise.all([
    refreshAndLearnBusinessKnowledge(
      trigger as Parameters<typeof refreshAndLearnBusinessKnowledge>[0]
    ),
    buildBusinessDNA(),
  ]);

  return NextResponse.json({
    ok: true,
    report,
    message: `Intelligence refreshed · ${report.routesDiscovered} routes · health ${report.executiveReport.overallHealthScore}/100 · ${report.memoriesCreated} new · ${report.memoriesUpdated} updated`,
  });
}
