import { getOperatorMetrics } from "../intelligence/business-operator";
import { getLearningOutcomes } from "../memory/learning";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { EvidenceItem } from "./types";
import { formatFreshness } from "../executive/data-quality";

export async function buildEvidenceCenter(limit = 15): Promise<EvidenceItem[]> {
  const workspaceId = getWorkspaceId();
  const [metrics, learnings, pinned] = await Promise.all([
    getOperatorMetrics(),
    getLearningOutcomes(undefined, 5),
    searchMemories({ workspaceId, limit: 8 }),
  ]);

  const evidence: EvidenceItem[] = [];

  evidence.push({
    id: "metric-revenue",
    title: `Revenue MTD: $${metrics.revenue.thisMonth.toLocaleString()}`,
    source: "Business operator / submissions",
    type: "metric",
    confidence: 0.85,
    businessImpact: "Primary financial health indicator",
    freshness: formatFreshness(metrics.generatedAt),
  });

  evidence.push({
    id: "metric-conversion",
    title: `Conversion rate: ${metrics.traffic.conversionRate}% (30d)`,
    source: "Analytics events",
    type: "metric",
    confidence: metrics.traffic.conversionRate > 0 ? 0.8 : 0.4,
    businessImpact: "Website and funnel performance",
    freshness: formatFreshness(metrics.generatedAt),
  });

  evidence.push({
    id: "metric-pipeline",
    title: `Pipeline: $${metrics.revenue.pipeline.toLocaleString()}`,
    source: "CRM + pipeline heuristics",
    type: "metric",
    confidence: 0.7,
    businessImpact: "Near-term revenue forecast",
    freshness: formatFreshness(metrics.generatedAt),
  });

  for (const l of learnings) {
    evidence.push({
      id: `learning-${l.id}`,
      title: l.hypothesis || `${l.actionType} → ${l.outcome}`,
      source: `${l.domain} learning engine`,
      type: "learning",
      confidence: l.confidence,
      businessImpact: l.revenueImpact ? `$${l.revenueImpact} impact` : `Outcome: ${l.outcome}`,
      freshness: formatFreshness(l.createdAt),
    });
  }

  for (const m of pinned.items.filter((x) => x.verified || x.pinned).slice(0, 5)) {
    evidence.push({
      id: `memory-${m.id}`,
      title: m.title,
      source: `${m.layer}/${m.category}`,
      type: "memory",
      confidence: m.confidence,
      businessImpact: m.summary.slice(0, 120) || "Institutional knowledge",
      freshness: formatFreshness(m.updatedAt),
    });
  }

  return evidence.slice(0, limit);
}
