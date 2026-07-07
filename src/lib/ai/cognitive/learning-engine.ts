import { getStoredPatterns } from "../marketing/learning-engine";
import { getLearningOutcomes } from "../memory/learning";
import { getOperatorMetrics } from "../intelligence/business-operator";

export async function buildLearningPatterns(): Promise<
  { pattern: string; confidence: number; businessImpact: string; source: string }[]
> {
  const [patterns, learnings, metrics] = await Promise.all([
    getStoredPatterns(8),
    getLearningOutcomes(undefined, 10),
    getOperatorMetrics(),
  ]);

  const results: { pattern: string; confidence: number; businessImpact: string; source: string }[] =
    [];

  for (const p of patterns) {
    results.push({
      pattern: p.pattern,
      confidence: p.confidence,
      businessImpact: p.impact ?? "Informs marketing and content strategy",
      source: "Marketing learning engine",
    });
  }

  for (const l of learnings) {
    if (l.hypothesis) {
      results.push({
        pattern: l.hypothesis,
        confidence: l.confidence,
        businessImpact:
          l.revenueImpact && l.revenueImpact > 0
            ? `$${l.revenueImpact.toLocaleString()} observed impact`
            : `Outcome: ${l.outcome}`,
        source: `${l.domain} / ${l.actionType}`,
      });
    }
  }

  if (metrics.month.bookingsChange !== 0) {
    results.push({
      pattern: `Booking volume ${metrics.month.bookingsChange > 0 ? "increased" : "decreased"} ${Math.abs(metrics.month.bookingsChange)}% MTD`,
      confidence: 0.8,
      businessImpact: "Sales pipeline health signal",
      source: "Business operator metrics",
    });
  }

  if (metrics.traffic.conversionRate > 0) {
    results.push({
      pattern: `Site converts at ${metrics.traffic.conversionRate}% over 30 days`,
      confidence: 0.75,
      businessImpact: "Website and funnel optimization baseline",
      source: "Analytics",
    });
  }

  return results.slice(0, 12);
}
