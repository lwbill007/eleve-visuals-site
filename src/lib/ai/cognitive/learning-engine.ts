import { getStoredPatterns } from "../marketing/learning-engine";
import { getLearningOutcomes } from "../memory/learning";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getSelfImprovementLessons } from "../executive/self-improvement";

export async function buildLearningPatterns(): Promise<
  { pattern: string; confidence: number; businessImpact: string; source: string }[]
> {
  const [patterns, learnings, metrics, lessons] = await Promise.all([
    getStoredPatterns(8),
    getLearningOutcomes(undefined, 12),
    getOperatorMetrics(),
    getSelfImprovementLessons(8),
  ]);

  const results: { pattern: string; confidence: number; businessImpact: string; source: string }[] =
    [];

  // Recent learnings first — visible evolution of the AI
  for (const lesson of lessons) {
    const arrow =
      lesson.confidenceChange === "increased"
        ? "✓"
        : lesson.confidenceChange === "decreased"
          ? "↓"
          : "·";
    results.push({
      pattern: `${arrow} ${lesson.lesson}`,
      confidence:
        lesson.confidenceChange === "increased"
          ? 0.86
          : lesson.confidenceChange === "decreased"
            ? 0.45
            : 0.6,
      businessImpact:
        lesson.confidenceChange === "increased"
          ? "Recommendation accuracy increased for similar actions"
          : lesson.confidenceChange === "decreased"
            ? "Confidence reduced — pattern needs more evidence"
            : "Outcome recorded · confidence unchanged",
      source: `Learning loop · ${lesson.domain}`,
    });
  }

  for (const p of patterns) {
    results.push({
      pattern: `✓ ${p.pattern}`,
      confidence: p.confidence,
      businessImpact: p.impact ?? "Informs marketing and content strategy",
      source: "Marketing learning engine",
    });
  }

  for (const l of learnings) {
    if (l.hypothesis && l.outcome !== "neutral") {
      results.push({
        pattern: `${l.outcome === "positive" ? "✓" : "↓"} ${l.hypothesis}`,
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
      pattern: `✓ Booking volume ${metrics.month.bookingsChange > 0 ? "increased" : "decreased"} ${Math.abs(metrics.month.bookingsChange)}% MTD`,
      confidence: 0.8,
      businessImpact: "Sales pipeline health signal",
      source: "Business operator metrics",
    });
  }

  if (metrics.traffic.conversionRate > 0) {
    results.push({
      pattern: `· Site converts at ${metrics.traffic.conversionRate}% over 30 days`,
      confidence: 0.75,
      businessImpact: "Website and funnel optimization baseline",
      source: "Analytics",
    });
  }

  // Dedupe similar patterns
  const seen = new Set<string>();
  return results
    .filter((r) => {
      const key = r.pattern.slice(0, 80).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}
