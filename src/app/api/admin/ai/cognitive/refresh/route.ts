import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { refreshAndLearnBusinessKnowledge } from "@/lib/ai/memory/knowledge";
import { buildBusinessDNA } from "@/lib/ai/cognitive/business-dna";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

const refreshSchema = z.object({
  trigger: z
    .enum([
      "manual",
      "deployment",
      "daily",
      "weekly",
      "portfolio_upload",
      "session_publish",
      "marketing_campaign",
      "crm_update",
      "booking_received",
    ])
    .default("manual"),
});

export async function POST(req: Request) {
  try {
    await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:cognitive-refresh");
  if (blocked) return blocked;

  const parsed = refreshSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refresh payload" }, { status: 400 });
  }
  const trigger = parsed.data.trigger;

  await invalidateIntelligenceCaches();

  const [report, qaReport] = await Promise.all([
    refreshAndLearnBusinessKnowledge(
      trigger
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
