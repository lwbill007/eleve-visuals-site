import type { ExecutiveScore } from "../types";
import type { getOperatorMetrics } from "./business-operator";

type OperatorMetrics = Awaited<ReturnType<typeof getOperatorMetrics>>;

function trendFromChange(change: number): ExecutiveScore["trend"] {
  if (change > 2) return "up";
  if (change < -2) return "down";
  return "flat";
}

function scoreWithWhy(
  key: string,
  label: string,
  value: number,
  change: number,
  why: string,
  evidence: string[],
  dataSources: string[],
  confidence: number
): ExecutiveScore {
  return {
    key,
    label,
    value: Math.min(100, Math.max(0, Math.round(value))),
    change: Math.round(change),
    trend: trendFromChange(change),
    why,
    evidence,
    dataSources,
    confidence,
  };
}

export function computeExecutiveScores(metrics: OperatorMetrics): ExecutiveScore[] {
  const {
    revenue,
    month,
    attention,
    traffic,
    repeatRate,
    returningClients,
    today,
  } = metrics;

  const businessHealth = Math.round(
    (Math.min(100, Math.max(20, 70 + month.bookingsChange)) +
      Math.min(100, traffic.conversionRate * 8) +
      Math.min(100, 100 - attention.tasks * 6)) /
      3
  );

  const revenueScore = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        50 +
          Math.min(30, revenue.monthChange) +
          (revenue.thisMonth > 0 ? 15 : 0) -
          attention.abandonedInquiries * 3
      )
    )
  );

  const marketingScore = Math.min(
    100,
    Math.max(
      15,
      Math.round(
        traffic.conversionRate * 6 +
          (traffic.trafficChange > 10 ? 15 : traffic.trafficChange < -15 ? -25 : traffic.trafficChange > 0 ? 8 : -8)
      )
    )
  );

  const salesScore = Math.min(100, Math.max(10, 100 - attention.abandonedInquiries * 4));
  const brandScore = Math.min(
    100,
    Math.max(
      20,
      Math.round(
        45 +
          (traffic.instagramChange > 0 ? 15 : 0) +
          Math.min(25, traffic.conversionRate * 3) +
          (repeatRate > 15 ? 10 : 0)
      )
    )
  );
  const operationsScore = Math.min(
    100,
    Math.max(10, 100 - attention.tasks * 8 - attention.galleriesAwaiting * 5)
  );
  const clientExperienceScore = Math.min(100, Math.max(20, Math.round(repeatRate + 40)));
  const productivityScore = Math.min(100, Math.max(10, 100 - attention.tasks * 7));

  return [
    scoreWithWhy(
      "businessHealth",
      "Business Health",
      businessHealth,
      month.bookingsChange,
      month.bookingsChange >= 0
        ? `Bookings ${month.bookingsChange >= 0 ? "up" : "down"} ${Math.abs(month.bookingsChange)}% vs last month; conversion at ${traffic.conversionRate}%; ${attention.tasks} pending tasks.`
        : `Bookings declined ${Math.abs(month.bookingsChange)}% this month with ${attention.abandonedInquiries} stale inquiries dragging momentum.`,
      [
        `${month.bookings} booking inquiries this month (${month.bookingsChange >= 0 ? "+" : ""}${month.bookingsChange}%)`,
        `${traffic.conversionRate}% site conversion rate`,
        `${attention.tasks} operational tasks pending`,
      ],
      ["Submissions", "Analytics", "Pipeline"],
      0.85
    ),
    scoreWithWhy(
      "revenue",
      "Revenue",
      revenueScore,
      revenue.monthChange,
      revenue.monthChange >= 0
        ? `Pipeline value ~$${revenue.thisMonth.toLocaleString()} MTD (${revenue.monthChange >= 0 ? "+" : ""}${revenue.monthChange}% vs last month).`
        : `Revenue trajectory softened — MTD ~$${revenue.thisMonth.toLocaleString()} (${revenue.monthChange}%). Recovery actions recommended.`,
      [
        `$${revenue.today.toLocaleString()} pipeline value added today`,
        `$${revenue.thisMonth.toLocaleString()} month-to-date`,
        `$${revenue.pipeline.toLocaleString()} total pipeline`,
      ],
      ["Pipeline", "Submissions"],
      0.8
    ),
    scoreWithWhy(
      "marketing",
      "Marketing",
      marketingScore,
      traffic.trafficChange,
      traffic.trafficChange >= 0
        ? `Traffic ${traffic.trafficChange >= 0 ? "grew" : "fell"} ${Math.abs(traffic.trafficChange)}% week-over-week; conversion ${traffic.conversionChange >= 0 ? "improving" : "softening"}.`
        : `Traffic down ${Math.abs(traffic.trafficChange)}% — top page ${traffic.topPage} needs promotion.`,
      [
        `${traffic.visitors30} visitors (30d)`,
        `${traffic.conversionRate}% conversion`,
        `${traffic.instagramReferrals} Instagram referrals`,
      ],
      ["Analytics"],
      0.82
    ),
    scoreWithWhy(
      "sales",
      "Sales",
      salesScore,
      -attention.abandonedInquiries,
      attention.abandonedInquiries > 0
        ? `${attention.abandonedInquiries} booking inquiries untouched 3+ days — estimated recovery opportunity.`
        : `Inquiry response time healthy; ${today.bookings} new bookings today.`,
      [
        `${attention.abandonedInquiries} stale inquiries`,
        `${month.bookings} bookings this month`,
        `$${attention.followUpValue.toLocaleString()} inactive lead value`,
      ],
      ["Submissions", "CRM", "Pipeline"],
      0.88
    ),
    scoreWithWhy(
      "brand",
      "Brand",
      brandScore,
      traffic.instagramChange,
      repeatRate >= 15
        ? `Repeat client rate ${repeatRate}% signals strong brand trust; Instagram ${traffic.instagramChange >= 0 ? "+" : ""}${traffic.instagramChange}%.`
        : `Brand momentum tied to conversion (${traffic.conversionRate}%) and social referrals.`,
      [
        `${repeatRate}% repeat client rate`,
        `${returningClients} returning clients`,
        `Instagram referrals ${traffic.instagramChange >= 0 ? "+" : ""}${traffic.instagramChange}%`,
      ],
      ["CRM", "Analytics"],
      0.75
    ),
    scoreWithWhy(
      "operations",
      "Operations",
      operationsScore,
      -attention.tasks,
      attention.galleriesAwaiting > 0
        ? `${attention.galleriesAwaiting} galleries awaiting delivery; ${attention.tasks} admin tasks open.`
        : `Operations load manageable with ${attention.tasks} pending tasks.`,
      [
        `${attention.tasks} pending tasks`,
        `${attention.galleriesAwaiting} galleries awaiting`,
        `${attention.overdueInvoices} overdue invoices`,
      ],
      ["Submissions", "Dashboard"],
      0.9
    ),
    scoreWithWhy(
      "clientExperience",
      "Client Experience",
      clientExperienceScore,
      repeatRate,
      `${returningClients} clients returned for additional work; repeat rate ${repeatRate}%.`,
      [
        `${returningClients} repeat clients`,
        `${repeatRate}% repeat rate`,
        `${attention.followUpClients} clients need follow-up`,
      ],
      ["CRM"],
      0.78
    ),
    scoreWithWhy(
      "productivity",
      "Productivity",
      productivityScore,
      -attention.tasks,
      attention.tasks > 3
        ? `${attention.tasks} items need attention — prioritize highest ROI actions first.`
        : `Admin workload light; capacity available for growth initiatives.`,
      [`${attention.tasks} pending tasks`, `${today.leads} leads today`],
      ["Dashboard"],
      0.85
    ),
  ];
}

/** Legacy 6-score shape for backward compatibility */
export function legacyScoresFromExecutive(scores: ExecutiveScore[]) {
  const get = (key: string) => scores.find((s) => s.key === key)?.value ?? 50;
  return {
    businessHealth: get("businessHealth"),
    marketing: get("marketing"),
    sales: get("sales"),
    productivity: get("productivity"),
    customerSatisfaction: get("clientExperience"),
    growth: Math.round((get("revenue") + get("marketing") + get("businessHealth")) / 3),
  };
}
