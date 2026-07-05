import { getAnalyticsSummary } from "@/lib/analytics-server";
import { writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { MarketingExperiment } from "./types";
import { getStoredPatterns } from "./learning-engine";

export async function recommendExperiments(): Promise<MarketingExperiment[]> {
  const [analytics, patterns] = await Promise.all([
    getAnalyticsSummary(30),
    getStoredPatterns(10),
  ]);

  const experiments: MarketingExperiment[] = [];
  const topPage = analytics.topPages[0]?.path ?? "/";
  const conversionRate = analytics.totals.conversionRate;

  const candidates: Omit<MarketingExperiment, "id" | "createdAt">[] = [
    {
      title: "Homepage hero headline A/B test",
      hypothesis: "Outcome-focused headline increases booking inquiries vs aesthetic-only",
      variable: "headline",
      variantA: "Cinematic portraits that elevate your personal brand",
      variantB: "Book your editorial portrait session — limited dates",
      platform: "website",
      status: "recommended",
      confidence: 0.78,
      recommendation: "Run for 2 weeks with 50/50 traffic split; measure /book conversions",
    },
    {
      title: "Primary CTA color test",
      hypothesis: "High-contrast CTA increases click-through to booking form",
      variable: "cta_color",
      variantA: "Cream CTA (current brand)",
      variantB: "Accent gold CTA",
      platform: "website",
      status: "recommended",
      confidence: 0.72,
      recommendation: "Test on homepage and top portfolio page",
    },
    {
      title: `Instagram hook test for ${topPage}`,
      hypothesis: "Question-hook outperforms statement-hook for portfolio posts",
      variable: "hook",
      variantA: "Would you book a session like this?",
      variantB: "Cinematic noir. Editorial light. Your story.",
      platform: "instagram",
      status: "recommended",
      confidence: 0.75,
      recommendation: "Post both variants 48h apart; compare saves and profile visits",
    },
    {
      title: "Booking form budget range test",
      hypothesis: "Showing premium anchor first increases average inquiry value",
      variable: "pricing_display",
      variantA: "Standard package first",
      variantB: "Premium package first",
      platform: "website",
      status: "recommended",
      confidence: 0.7,
      recommendation: "Track pipeline value per inquiry for 30 days",
    },
    {
      title: "Email subject line re-engagement test",
      hypothesis: "Personal subject lines outperform studio-branded subjects",
      variable: "email_subject",
      variantA: "We saved a date for you, [Name]",
      variantB: "ÉLEVÉ Visuals — new work + booking availability",
      platform: "email",
      status: "recommended",
      confidence: 0.74,
      recommendation: "Split inactive CRM segment; measure open and reply rates",
    },
    {
      title: "Portfolio order test",
      hypothesis: "Leading with highest-traffic project increases overall conversion",
      variable: "portfolio_order",
      variantA: "Chronological order",
      variantB: `Lead with ${topPage.replace("/portfolio/", "")}`,
      platform: "website",
      status: "recommended",
      confidence: 0.8,
      recommendation: "Swap featured project for 2 weeks; compare site-wide conversion",
    },
  ];

  if (conversionRate < 2) {
    candidates.unshift({
      title: "Booking page friction audit + CTA test",
      hypothesis: "Reducing form fields increases completion rate",
      variable: "form_length",
      variantA: "Current booking form",
      variantB: "Short-form (name, email, service only)",
      platform: "website",
      status: "recommended",
      confidence: 0.82,
      recommendation: `Priority — site conversion at ${conversionRate}% is below target`,
    });
  }

  for (const c of candidates) {
    const exp: MarketingExperiment = {
      ...c,
      id: `exp-${c.variable}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    experiments.push(exp);

    await writeMemory({
      workspaceId: getWorkspaceId(),
      layer: "marketing",
      category: "experiment",
      key: exp.id,
      title: exp.title,
      summary: exp.hypothesis,
      value: exp as unknown as Record<string, unknown>,
      confidence: exp.confidence,
      importance: 70,
      source: "ai",
      sourceRef: "experiment-engine",
      tags: ["cmo", "experiment", exp.platform],
      actor: "experiment-engine",
      reason: exp.recommendation,
    });
  }

  if (patterns.length > 0) {
    experiments[0].recommendation += ` · Informed by: ${patterns[0].pattern}`;
  }

  return experiments;
}

export async function declareExperimentWinner(
  experimentId: string,
  winner: "A" | "B",
  results: { variant: "A" | "B"; metric: string; value: number }[]
): Promise<void> {
  const { getMemory } = await import("../memory/store");
  const mem = await getMemory("marketing", "experiment", experimentId, getWorkspaceId());
  if (!mem) return;

  const exp = mem.value as unknown as MarketingExperiment;
  const updated: MarketingExperiment = {
    ...exp,
    status: "winner_declared",
    winner,
    results,
    recommendation: `Winner: Variant ${winner}. Store permanently and apply to future campaigns.`,
  };

  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "experiment",
    key: experimentId,
    title: `${exp.title} — Winner: ${winner}`,
    summary: updated.recommendation,
    value: updated as unknown as Record<string, unknown>,
    confidence: 0.95,
    importance: 88,
    source: mem.source,
    sourceRef: mem.sourceRef,
    tags: [...mem.tags, "winner"],
    pinned: true,
    verified: true,
    actor: "experiment-engine",
    reason: `A/B winner declared: ${winner}`,
  });
}
