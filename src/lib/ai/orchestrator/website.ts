/**
 * Website SEO orchestrator — evidence-grade multi-agent review.
 */

import { buildWebsiteIntelligenceEngine } from "../intelligence/website-engine";
import {
  buildEvidenceBundle,
  scoreConfidenceFromEvidence,
  type EvidenceItem,
} from "../evidence/schema";
import { recallAgentMemory } from "../agents/agent-memory";
import { toolNamesForAgent } from "../agents/tool-registry";
import { selectAgentsForTask, agentTitle } from "./select";
import { runVerificationPipeline } from "./pipeline";
import type {
  AgentRunRecord,
  OrchestratorAuditLog,
  OrchestratorResult,
  RecommendedAction,
} from "./types";

export async function orchestrateWebsiteSeo(): Promise<OrchestratorResult> {
  const now = new Date().toISOString();
  const engine = await buildWebsiteIntelligenceEngine();
  const agentsSelected = selectAgentsForTask("website_seo");

  const evidenceItems: EvidenceItem[] = engine.evidence.items;
  const evidence = buildEvidenceBundle(engine.executiveSummary, evidenceItems);
  const confidence = scoreConfidenceFromEvidence(evidenceItems, {
    overall: engine.confidence.overall,
    creative: engine.confidence.content,
    business: engine.confidence.conversion,
    research: engine.confidence.research,
    production: engine.confidence.performance,
    sales: engine.confidence.conversion,
    reasoning: engine.confidence.reasoning,
  });

  const agentRuns: AgentRunRecord[] = [];
  for (const agentId of agentsSelected) {
    const startedAt = new Date().toISOString();
    const memory = await recallAgentMemory(agentId, 4);
    let summary = "";
    let reasoning = "";
    let conf = confidence.overall;

    if (agentId === "seo") {
      const seo = engine.categories.find((c) => c.id === "seo");
      summary = seo
        ? `SEO ${seo.scoreLabel} · ${seo.truthKind} · ${seo.summary}`
        : "SEO category unavailable";
      reasoning = engine.recommendations
        .filter((r) => r.domain === "seo")
        .slice(0, 2)
        .map((r) => r.title)
        .join(" · ") || memory;
      conf = engine.confidence.seo;
    } else if (agentId === "cmo") {
      summary = engine.executiveSummary.split(". ").slice(0, 2).join(". ");
      reasoning = engine.recommendations
        .filter((r) => r.domain === "conversion" || r.domain === "content")
        .slice(0, 2)
        .map((r) => r.title)
        .join(" · ");
      conf = engine.confidence.conversion;
    } else if (agentId === "research_specialist") {
      summary =
        "Live web / Search Console verification skipped — connector not wired. Using internal analytics + scan only.";
      reasoning = memory;
      conf = engine.confidence.research;
    } else {
      summary = engine.executiveSummary;
      reasoning = "General website review";
    }

    agentRuns.push({
      agentId,
      title: agentTitle(agentId),
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary,
      reasoning,
      evidenceIds: evidenceItems.slice(0, 5).map((e) => e.id),
      toolsAttempted: toolNamesForAgent(agentId).filter((t) =>
        ["get_analytics", "get_portfolio_summary", "search_business"].includes(t)
      ),
      confidence: conf,
    });
  }

  const actions: RecommendedAction[] = engine.recommendations.slice(0, 6).flatMap((r) =>
    r.actions
      .filter((a) => a.href)
      .slice(0, 1)
      .map((a) => ({
        id: `${r.id}-${a.id}`,
        label: a.label,
        href: a.href,
        requiresApproval: a.requiresApproval,
        priority: r.priority === "critical" || r.priority === "high" ? "high" : "medium",
        ownerAgent: r.domain === "seo" ? "seo" : r.domain === "conversion" ? "cmo" : "research_specialist",
      }))
  );

  const verificationSteps = await runVerificationPipeline({
    hasInternalData: engine.dataSources.some((d) => d.present),
    evidence,
    needsLiveWeb: false,
  });

  const audit: OrchestratorAuditLog = {
    id: `orch-website-${Date.now()}`,
    taskKind: "website_seo",
    createdAt: now,
    surface: "website",
    agents: agentRuns,
    confidence,
    evidence,
    actions,
    executiveSummary: engine.executiveSummary,
    verificationSteps,
    provider: "rules",
  };

  return {
    audit,
    executiveSummary: engine.executiveSummary,
    confidence,
    evidence,
    actions,
  };
}
