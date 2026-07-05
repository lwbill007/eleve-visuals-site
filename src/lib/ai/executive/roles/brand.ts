import { getBrandInstitutionalMemory } from "../../marketing/brand-memory";
import { getOperatorMetrics } from "../../intelligence/business-operator";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildBrandBrief(): Promise<ExecutiveRoleBrief> {
  const [brand, metrics] = await Promise.all([getBrandInstitutionalMemory(), getOperatorMetrics()]);

  const brandScore = Math.min(
    100,
    Math.max(
      50,
      55 +
        (metrics.traffic.instagramChange > 0 ? 12 : 0) +
        Math.min(20, metrics.traffic.conversionRate * 2) +
        (metrics.repeatRate > 15 ? 10 : 0)
    )
  );

  return {
    id: "brand",
    title: ROLE_META.brand.title,
    mission: ROLE_META.brand.mission,
    healthScore: brandScore,
    confidence: 0.85,
    topPriority: "Maintain premium editorial tone across all touchpoints",
    insights: [
      { text: `Voice: ${brand?.identity.voice ?? "Premium cinematic editorial"}`, kind: "fact" },
      { text: `Visual: ${brand?.identity.visualStyle ?? "Cinematic noir"}`, kind: "fact" },
      {
        text: `${metrics.repeatRate}% repeat client rate signals brand trust`,
        kind: "fact",
        evidence: [`${metrics.returningClients} returning clients`],
      },
      {
        text: `Instagram referrals ${metrics.traffic.instagramChange >= 0 ? "+" : ""}${metrics.traffic.instagramChange}%`,
        kind: metrics.traffic.instagramChange >= 0 ? "fact" : "inference",
      },
    ],
    recommendations: [
      {
        id: "brand-consistency",
        title: "Audit homepage hero against brand voice",
        detail: "Ensure hero headline, CTA, and imagery match luxury positioning",
        why: brand?.competitiveAdvantages[0] ?? "Premium positioning is core differentiator",
        kind: "suggestion",
        confidence: 0.8,
        expectedImpact: "Brand perception + conversion",
        actions: [
          { id: "homepage", label: "Edit Homepage", type: "navigate", href: "/admin/homepage" },
          { id: "about", label: "Brand Story", type: "navigate", href: "/admin/about" },
        ],
      },
    ],
    metrics: [
      { label: "Repeat rate", value: `${metrics.repeatRate}%`, source: "CRM" },
      { label: "Instagram", value: `${metrics.traffic.instagramReferrals} refs`, source: "Analytics" },
      { label: "Conversion", value: `${metrics.traffic.conversionRate}%`, source: "Analytics" },
      { label: "Advantages", value: String(brand?.competitiveAdvantages.length ?? 0), source: "Brand memory" },
    ],
    href: ROLE_META.brand.href,
  };
}
