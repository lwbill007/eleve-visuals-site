import { getOperatorMetrics } from "../intelligence/business-operator";
import type { StrategySimulation } from "./types";

function insufficientBase(scenario: string, reason: string): StrategySimulation {
  return {
    scenario,
    revenue: { low: 0, mid: 0, high: 0 },
    bookings: { low: 0, mid: 0, high: 0 },
    demand: "Unknown — insufficient measured base",
    brandPerception: "N/A until MTD revenue or bookings exist",
    profit: { low: 0, mid: 0, high: 0 },
    capacity: "N/A",
    risk: "Simulation refused — no invented dollar baselines",
    confidence: 0,
    assumptions: [reason],
  };
}

const SCENARIOS: Record<
  string,
  (m: Awaited<ReturnType<typeof getOperatorMetrics>>) => StrategySimulation
> = {
  increase_pricing_15: (m) => {
    if (m.revenue.thisMonth <= 0) {
      return insufficientBase(
        "Increase pricing 15%",
        "MTD revenue is 0 — cannot simulate from invented $5000 base"
      );
    }
    const base = m.revenue.thisMonth;
    const bookings = Math.max(m.month.bookings, 0);
    return {
      scenario: "Increase pricing 15%",
      revenue: {
        low: Math.round(base * 0.95),
        mid: Math.round(base * 1.08),
        high: Math.round(base * 1.15),
      },
      bookings: {
        low: bookings > 0 ? Math.max(1, Math.round(bookings * 0.75)) : 0,
        mid: bookings > 0 ? Math.round(bookings * 0.9) : 0,
        high: bookings,
      },
      demand: "Moderate elasticity — luxury positioning may absorb price increase (AI Analysis)",
      brandPerception: "Strengthens premium signal if communicated with value narrative (AI Analysis)",
      profit: {
        low: Math.round(base * 0.3),
        mid: Math.round(base * 0.42),
        high: Math.round(base * 0.5),
      },
      capacity: "Same shoot volume, higher margin per session",
      risk: "10–25% inquiry drop if not paired with portfolio/social proof (AI Prediction)",
      confidence: 0.55,
      assumptions: [
        `Base = $${base.toLocaleString()} MTD revenue (${m.revenue.verified ? "Payments Verified" : "pipeline estimate"})`,
        "Current positioning supports premium tier",
        "No competitor undercutting in same market",
        "Value communication updated on /services",
      ],
    };
  },
  launch_memberships: (m) => {
    if (m.revenue.thisMonth <= 0) {
      return insufficientBase(
        "Launch membership program",
        "MTD revenue is 0 — cannot invent membership revenue curves"
      );
    }
    const base = m.revenue.thisMonth;
    return {
      scenario: "Launch membership program",
      revenue: {
        low: Math.round(base * 1.1),
        mid: Math.round(base * 1.35),
        high: Math.round(base * 1.6),
      },
      bookings: {
        low: Math.max(0, m.month.bookings),
        mid: m.month.bookings + 2,
        high: m.month.bookings + 4,
      },
      demand: "Recurring revenue from founding members (AI Prediction — member count unmeasured)",
      brandPerception: "Elevates to relationship studio vs transactional (AI Analysis)",
      profit: { low: 0, mid: 0, high: 0 },
      capacity: "Requires dedicated member scheduling blocks",
      risk: "Operational complexity; must deliver consistent member value",
      confidence: 0.4,
      assumptions: [
        `Scaled from $${base.toLocaleString()} MTD — profit Unknown until COGS modeled`,
        "Membership price and take-rate not measured",
      ],
    };
  },
  open_volume_2: (m) => {
    if (m.month.bookings <= 0 && m.revenue.thisMonth <= 0) {
      return insufficientBase(
        "Open ÉLEVÉ Sessions Volume 2",
        "No MTD bookings/revenue — Volume 2 $ outcomes Unknown until Volume 1 measured results"
      );
    }
    return {
      scenario: "Open ÉLEVÉ Sessions Volume 2",
      revenue: { low: 0, mid: 0, high: 0 },
      bookings: { low: 0, mid: 0, high: 0 },
      demand: "Qualitative only — application spike possible if Volume 1 alumni evangelize",
      brandPerception: "Strengthens Sessions IP if quality holds (AI Analysis)",
      profit: { low: 0, mid: 0, high: 0 },
      capacity: "Significant production and casting workload",
      risk: "Brand dilution if quality drops vs Volume 1",
      confidence: 0.35,
      assumptions: [
        "Dollar outcomes Unknown — no invented Volume 2 revenue bands",
        "Requires Volume 1 conversion + sponsor data before numeric forecast",
      ],
    };
  },
  hire_photographer: (m) => {
    if (m.revenue.thisMonth <= 0) {
      return insufficientBase(
        "Hire associate photographer",
        "MTD revenue is 0 — cannot invent capacity-lift revenue"
      );
    }
    const base = m.revenue.thisMonth;
    return {
      scenario: "Hire associate photographer",
      revenue: {
        low: base,
        mid: Math.round(base * 1.4),
        high: Math.round(base * 1.8),
      },
      bookings: {
        low: m.month.bookings,
        mid: m.month.bookings + 4,
        high: m.month.bookings + 8,
      },
      demand: "Unlocks parallel bookings if overflow demand exists (unmeasured)",
      brandPerception: "Neutral if quality bar maintained (AI Analysis)",
      profit: { low: 0, mid: 0, high: 0 },
      capacity: "Potential capacity lift after ramp — contractor cost Unknown",
      risk: "Training cost, brand consistency, management overhead",
      confidence: 0.45,
      assumptions: [
        `Revenue bands scaled from $${base.toLocaleString()} MTD — profit Unknown without payroll model`,
        "Overflow demand not measured",
      ],
    };
  },
  spend_500_ads: (m) => ({
    scenario: "Spend $500 on targeted ads",
    revenue: { low: 0, mid: 0, high: 0 },
    bookings: { low: 0, mid: 0, high: 0 },
    demand: "Unknown without historical CAC / ROAS",
    brandPerception: "Depends on creative quality (AI Analysis)",
    profit: { low: -500, mid: 0, high: 0 },
    capacity: "N/A",
    risk: "Spend without attribution wastes budget",
    confidence: m.traffic.visitors30 > 0 ? 0.3 : 0,
    assumptions: [
      "Revenue outcomes Unknown — no invented ROAS",
      "Requires ads + conversion attribution before forecasting",
    ],
  }),
  seasonal_campaign: (m) => {
    if (m.revenue.thisMonth <= 0) {
      return insufficientBase(
        "Run seasonal portrait campaign",
        "MTD revenue is 0 — cannot invent seasonal revenue curves"
      );
    }
    const base = m.revenue.thisMonth;
    return {
      scenario: "Run seasonal portrait campaign",
      revenue: {
        low: Math.round(base * 0.8),
        mid: Math.round(base * 1.25),
        high: Math.round(base * 1.5),
      },
      bookings: {
        low: Math.max(0, m.month.bookings),
        mid: m.month.bookings + 2,
        high: m.month.bookings + 4,
      },
      demand: "Seasonal urgency may drive inquiries (AI Prediction)",
      brandPerception: "Positive if campaign feels editorial (AI Analysis)",
      profit: { low: 0, mid: 0, high: 0 },
      capacity: "Burst demand — plan calendar blocks in advance",
      risk: "Discounting undermines luxury positioning",
      confidence: 0.5,
      assumptions: [
        `Scaled from $${base.toLocaleString()} MTD — profit Unknown`,
        "Limited slots messaging",
        "No deep discounting",
      ],
    };
  },
};

export async function runStrategySimulation(scenarioId: string): Promise<StrategySimulation> {
  const metrics = await getOperatorMetrics();
  const fn = SCENARIOS[scenarioId];
  if (!fn) {
    return insufficientBase(scenarioId, "Scenario not modeled");
  }
  return fn(metrics);
}

export function listSimulationScenarios(): { id: string; label: string }[] {
  return [
    { id: "increase_pricing_15", label: "Increase pricing 15%" },
    { id: "launch_memberships", label: "Launch membership program" },
    { id: "open_volume_2", label: "Open ÉLEVÉ Sessions Volume 2" },
    { id: "hire_photographer", label: "Hire associate photographer" },
    { id: "spend_500_ads", label: "Spend $500 on targeted ads" },
    { id: "seasonal_campaign", label: "Run seasonal portrait campaign" },
  ];
}
