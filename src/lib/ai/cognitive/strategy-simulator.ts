import { getOperatorMetrics } from "../intelligence/business-operator";
import type { StrategySimulation } from "./types";

const SCENARIOS: Record<
  string,
  (m: Awaited<ReturnType<typeof getOperatorMetrics>>) => StrategySimulation
> = {
  "increase_pricing_15": (m) => {
    const base = m.revenue.thisMonth || 5000;
    const bookings = m.month.bookings || 3;
    return {
      scenario: "Increase pricing 15%",
      revenue: {
        low: Math.round(base * 0.95),
        mid: Math.round(base * 1.08),
        high: Math.round(base * 1.15),
      },
      bookings: {
        low: Math.max(1, Math.round(bookings * 0.75)),
        mid: Math.round(bookings * 0.9),
        high: bookings,
      },
      demand: "Moderate elasticity — luxury positioning may absorb price increase",
      brandPerception: "Strengthens premium signal if communicated with value narrative",
      profit: {
        low: Math.round(base * 0.3),
        mid: Math.round(base * 0.42),
        high: Math.round(base * 0.5),
      },
      capacity: "Same shoot volume, higher margin per session",
      risk: "10–25% inquiry drop if not paired with portfolio/social proof",
      confidence: 0.65,
      assumptions: [
        "Current positioning supports premium tier",
        "No competitor undercutting in same market",
        "Value communication updated on /services",
      ],
    };
  },
  launch_memberships: (m) => ({
    scenario: "Launch membership program",
    revenue: {
      low: Math.round((m.revenue.thisMonth || 3000) * 1.1),
      mid: Math.round((m.revenue.thisMonth || 3000) * 1.35),
      high: Math.round((m.revenue.thisMonth || 3000) * 1.6),
    },
    bookings: { low: 4, mid: 8, high: 15 },
    demand: "Recurring revenue from 5–15 founding members",
    brandPerception: "Elevates to relationship studio vs transactional",
    profit: { low: 800, mid: 2000, high: 4500 },
    capacity: "Requires dedicated member scheduling blocks",
    risk: "Operational complexity; must deliver consistent member value",
    confidence: 0.55,
    assumptions: ["$150–350/mo tier", "Quarterly mini-session included", "VIP CRM nurture"],
  }),
  open_volume_2: () => ({
    scenario: "Open ÉLEVÉ Sessions Volume 2",
    revenue: { low: 2000, mid: 6000, high: 12000 },
    bookings: { low: 15, mid: 40, high: 80 },
    demand: "High if Volume 1 alumni evangelize — applications spike",
    brandPerception: "Strengthens Sessions IP and community moat",
    profit: { low: 500, mid: 2500, high: 6000 },
    capacity: "Significant production and casting workload",
    risk: "Brand dilution if quality drops vs Volume 1",
    confidence: 0.7,
    assumptions: ["Volume 1 conversion data available", "Cast pipeline ready", "Sponsor interest"],
  }),
  hire_photographer: (m) => ({
    scenario: "Hire associate photographer",
    revenue: {
      low: m.revenue.thisMonth,
      mid: Math.round((m.revenue.thisMonth || 5000) * 1.4),
      high: Math.round((m.revenue.thisMonth || 5000) * 1.8),
    },
    bookings: {
      low: m.month.bookings,
      mid: m.month.bookings + 4,
      high: m.month.bookings + 8,
    },
    demand: "Unlocks parallel bookings — capacity becomes bottleneck removed",
    brandPerception: "Neutral if quality bar maintained; risk if style inconsistent",
    profit: { low: -500, mid: 1500, high: 4000 },
    capacity: "Doubles shoot capacity after 60-day ramp",
    risk: "Training cost, brand consistency, management overhead",
    confidence: 0.6,
    assumptions: ["$3–5k/mo contractor", "ÉLEVÉ style guide enforced", "Overflow demand exists"],
  }),
  spend_500_ads: () => ({
    scenario: "Spend $500 on targeted ads",
    revenue: { low: 0, mid: 1500, high: 4000 },
    bookings: { low: 0, mid: 1, high: 3 },
    demand: "Depends on creative quality and landing page conversion",
    brandPerception: "Low risk if ads match cinematic brand aesthetic",
    profit: { low: -500, mid: 500, high: 2500 },
    capacity: "Minimal — fills existing calendar gaps",
    risk: "Poor targeting wastes budget; hurts CAC metrics",
    confidence: 0.45,
    assumptions: ["Portfolio landing page", "Retargeting warm audience", "Ad spend tracked"],
  }),
  seasonal_campaign: (m) => ({
    scenario: "Run seasonal portrait campaign",
    revenue: {
      low: Math.round((m.revenue.thisMonth || 3000) * 0.8),
      mid: Math.round((m.revenue.thisMonth || 3000) * 1.25),
      high: Math.round((m.revenue.thisMonth || 3000) * 1.5),
    },
    bookings: { low: 2, mid: 5, high: 10 },
    demand: "Seasonal urgency drives inquiries — Q4 and spring peaks typical",
    brandPerception: "Positive if campaign feels editorial, not discount-driven",
    profit: { low: 400, mid: 1800, high: 3500 },
    capacity: "Burst demand — plan calendar blocks in advance",
    risk: "Discounting undermines luxury positioning",
    confidence: 0.68,
    assumptions: ["Limited slots messaging", "Email + Instagram coordinated", "No deep discounting"],
  }),
};

export async function runStrategySimulation(scenarioId: string): Promise<StrategySimulation> {
  const metrics = await getOperatorMetrics();
  const fn = SCENARIOS[scenarioId];
  if (!fn) {
    return {
      scenario: scenarioId,
      revenue: { low: 0, mid: 0, high: 0 },
      bookings: { low: 0, mid: 0, high: 0 },
      demand: "Unknown scenario",
      brandPerception: "N/A",
      profit: { low: 0, mid: 0, high: 0 },
      capacity: "N/A",
      risk: "Scenario not modeled",
      confidence: 0,
      assumptions: [],
    };
  }
  return fn(metrics);
}

export function listSimulationScenarios(): { id: string; label: string }[] {
  return [
    { id: "increase_pricing_15", label: "Increase pricing 15%" },
    { id: "launch_memberships", label: "Launch memberships" },
    { id: "open_volume_2", label: "Open Volume 2" },
    { id: "hire_photographer", label: "Hire photographer" },
    { id: "spend_500_ads", label: "Spend $500 on ads" },
    { id: "seasonal_campaign", label: "Run seasonal campaign" },
  ];
}
