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

  const [report, qaReport] = await Promise.all([
    refreshAndLearnBusinessKnowledge(
      trigger as Parameters<typeof refreshAndLearnBusinessKnowledge>[0]
    ),
    import("@/lib/ai/truth/executive-qa").then(({ runExecutiveQA }) => runExecutiveQA().catch(() => null)),
  ]);
  await buildBusinessDNA();

  return NextResponse.json({
    ok: true,
    report,
    briefing: {
      executiveSummary: report.executiveReport.summary,
      biggestDiscovery: report.whatChanged[0] ?? "Platform scan complete",
      biggestOpportunity: report.opportunities[0] ?? "Review opportunities panel",
      biggestRisk: report.issuesFound[0]?.title ?? "No critical issues",
      knowledgeChanges: [
        `${report.memoriesCreated} new · ${report.memoriesUpdated} updated`,
        `${report.graphLinksCreated} graph links · ${report.learningOutcomesRecorded} learnings`,
      ],
      healthScore: report.executiveReport.overallHealthScore,
      qaScore: qaReport?.overallScore,
      qaIssues: qaReport?.issues?.length ?? 0,
    },
    message: `Executive intelligence refreshed · ${report.routesDiscovered} routes · health ${report.executiveReport.overallHealthScore}/100${qaReport ? ` · QA ${qaReport.overallScore}/100` : ""}`,
  });
}
