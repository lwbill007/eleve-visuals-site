import type { ExecutiveRoleId } from "./types";
import type { ExecutiveRoleBrief } from "./types";
import type { ExecutiveIntelligence, ExecutiveOpportunity, ExecutiveRisk } from "../types";

export interface SynthesizedPriority {
  id: string;
  title: string;
  why: string;
  urgency: "critical" | "high" | "medium" | "low";
  confidence: number;
  expectedRevenue: number;
  effort: "low" | "medium" | "high";
  supportingRoles: ExecutiveRoleId[];
  dissent?: string;
  href: string;
  actions: { label: string; href: string }[];
}

export interface SynthesizedExecutiveBriefing {
  generatedAt: string;
  headline: string;
  narrative: string;
  businessHealthSummary: string;
  moneyOnTable: number;
  topPriorities: SynthesizedPriority[];
  agreements: string[];
  disagreements: { topic: string; positions: string[] }[];
  directorConsensus: number;
  weeklyFocus: string[];
}

function urgencyRank(u: SynthesizedPriority["urgency"]): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[u];
}

export function synthesizeExecutiveBriefing(input: {
  roles: ExecutiveRoleBrief[];
  intelligence: ExecutiveIntelligence;
  opportunities: ExecutiveOpportunity[];
}): SynthesizedExecutiveBriefing {
  const { roles, intelligence, opportunities } = input;

  const revenueOpportunities = opportunities.filter((o) => o.expectedRevenue >= 100);
  const rankedOpportunities = revenueOpportunities.length > 0 ? revenueOpportunities : opportunities;

  const moneyOnTable = rankedOpportunities.reduce((s, o) => s + o.expectedRevenue * o.confidence, 0);

  const rolePriorities = roles.map((r) => ({
    roleId: r.id,
    title: r.topPriority,
    health: r.healthScore,
    confidence: r.confidence,
    rec: r.recommendations[0],
  }));

  const topPriorities: SynthesizedPriority[] = rankedOpportunities.slice(0, 6).map((o) => ({
    id: o.id,
    title: o.title,
    why: o.why,
    urgency: o.urgency,
    confidence: o.confidence,
    expectedRevenue: o.expectedRevenue,
    effort: o.effort,
    supportingRoles: inferSupportingRoles(o.category, roles),
    href: o.actions[0]?.href ?? "/admin/opportunities",
    actions: o.actions.slice(0, 3).map((a) => ({ label: a.label, href: a.href ?? "/admin" })),
  }));

  for (const r of roles) {
    const rec = r.recommendations[0];
    if (!rec || topPriorities.some((p) => p.title === rec.title)) continue;
    if (r.healthScore < 55 || r.confidence > 0.75) {
      topPriorities.push({
        id: `role-${r.id}-${rec.id}`,
        title: rec.title,
        why: rec.why,
        urgency: r.healthScore < 45 ? "high" : "medium",
        confidence: rec.confidence,
        expectedRevenue: parseRevenue(rec.expectedImpact),
        effort: "medium",
        supportingRoles: [r.id],
        href: rec.actions[0]?.href ?? r.href,
        actions: rec.actions.slice(0, 2).map((a) => ({ label: a.label, href: a.href ?? r.href })),
      });
    }
  }

  topPriorities.sort(
    (a, b) =>
      urgencyRank(a.urgency) - urgencyRank(b.urgency) ||
      b.expectedRevenue * b.confidence - a.expectedRevenue * a.confidence
  );

  const lowHealthRoles = roles.filter((r) => r.healthScore < 50);
  const disagreements =
    lowHealthRoles.length >= 2
      ? [
          {
            topic: "Resource allocation",
            positions: lowHealthRoles.map(
              (r) => `${r.title}: prioritize ${r.topPriority} (health ${r.healthScore})`
            ),
          },
        ]
      : [];

  const agreements = [
    rankedOpportunities[0]
      ? `Revenue team aligned on: ${rankedOpportunities[0].title}`
      : "No critical revenue gaps detected",
    intelligence.risks[0]
      ? `Risk watch: ${intelligence.risks[0].title}`
      : "Operational risks within normal range",
  ];

  const avgHealth = Math.round(roles.reduce((s, r) => s + r.healthScore, 0) / Math.max(roles.length, 1));
  const businessScore = intelligence.scores.find((s) => s.key === "businessHealth")?.value ?? avgHealth;

  const headline =
    topPriorities[0]
      ? `${topPriorities[0].title} — prioritize evidence-backed actions (do not cite invented recoverable $)`
      : businessScore >= 70
        ? "Business health is strong — focus on growth and brand elevation"
        : `Business health at ${businessScore}/100 — review priorities`;

  const narrative = buildNarrative(roles, rankedOpportunities, intelligence.risks);

  return {
    generatedAt: new Date().toISOString(),
    headline,
    narrative,
    businessHealthSummary: `Composite health ${businessScore}/100 across ${roles.length} directors. ${rolePriorities.filter((p) => p.health < 55).length} areas need attention.`,
    moneyOnTable: Math.round(moneyOnTable),
    topPriorities: topPriorities.slice(0, 8),
    agreements,
    disagreements,
    directorConsensus: Math.round(roles.reduce((s, r) => s + r.confidence, 0) / Math.max(roles.length, 1) * 100) / 100,
    weeklyFocus: topPriorities.slice(0, 4).map((p) => p.title),
  };
}

function inferSupportingRoles(
  category: ExecutiveOpportunity["category"],
  roles: ExecutiveRoleBrief[]
): ExecutiveRoleId[] {
  const map: Record<string, ExecutiveRoleId[]> = {
    revenue: ["ceo", "cso"],
    marketing: ["cmo", "brand"],
    sales: ["cso", "client_success"],
    sessions: ["creative", "cmo"],
    operations: ["operations", "ceo"],
    technical: ["operations", "cmo"],
  };
  const ids = map[category] ?? ["ceo"];
  return ids.filter((id) => roles.some((r) => r.id === id));
}

function parseRevenue(impact: string): number {
  const m = impact.match(/\$([\d,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
}

function buildNarrative(
  roles: ExecutiveRoleBrief[],
  opportunities: ExecutiveOpportunity[],
  risks: ExecutiveRisk[]
): string {
  const parts: string[] = [];
  const ceo = roles.find((r) => r.id === "ceo");
  if (ceo) parts.push(`CEO: ${ceo.topPriority}`);
  if (opportunities[0]) {
    parts.push(
      `Top opportunity — ${opportunities[0].title} (${Math.round(opportunities[0].confidence * 100)}% confidence, ~$${opportunities[0].expectedRevenue.toLocaleString()} upside).`
    );
  }
  if (risks[0]) parts.push(`Primary risk: ${risks[0].title}. ${risks[0].detail}`);
  const cmo = roles.find((r) => r.id === "cmo");
  if (cmo && cmo.healthScore < 60) parts.push(`Marketing needs attention: ${cmo.topPriority}`);
  return parts.join(" ");
}
