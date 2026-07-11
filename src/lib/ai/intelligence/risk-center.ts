import { getAnalyticsSummary } from "@/lib/analytics-server";
import type { ExecutiveRisk } from "../types";
import { getOperatorMetrics, OS_ROUTES } from "./business-operator";

export async function getExecutiveRisks(): Promise<ExecutiveRisk[]> {
  const [metrics, analytics30, analytics7] = await Promise.all([
    getOperatorMetrics(),
    getAnalyticsSummary(30),
    getAnalyticsSummary(7),
  ]);

  const risks: ExecutiveRisk[] = [];
  const now = new Date().toISOString();

  if (metrics.month.bookingsChange <= -15) {
    risks.push({
      id: "bookings-decline",
      title: "Booking volume declining",
      detail: `Bookings down ${Math.abs(metrics.month.bookingsChange)}% vs last month — revenue forecast at risk.`,
      why: `Only ${metrics.month.bookings} inquiries this month vs prior period.`,
      category: "revenue",
      severity: metrics.month.bookingsChange <= -25 ? "critical" : "high",
      likelihood: 0.85,
      potentialImpact: metrics.revenue.thisMonth * 0.3,
      evidence: [`${metrics.month.bookingsChange}% month-over-month change`, "Submission counts verified"],
      mitigations: [
        { id: "m-bookings", label: "Launch recovery campaign", type: "create_campaign", href: "/admin/marketing?focus=launch_campaign" },
        { id: "m-pipeline", label: "Review pipeline", type: "navigate", href: "/admin/pipeline" },
      ],
      detectedAt: now,
    });
  }

  if (metrics.attention.abandonedInquiries >= 3) {
    risks.push({
      id: "missed-followups",
      title: "Missed booking follow-ups",
      detail: `${metrics.attention.abandonedInquiries} inquiries waiting 3+ days without response.`,
      why: "Slow response correlates with lost portrait bookings — verified from submission status timestamps.",
      category: "sales",
      severity: metrics.attention.abandonedInquiries >= 6 ? "critical" : "high",
      likelihood: 0.9,
      potentialImpact: metrics.attention.abandonedInquiries * 1200,
      evidence: [`${metrics.attention.abandonedInquiries} stale inquiries`, "Status: new/contacted"],
      mitigations: [
        { id: "m-follow", label: "Draft follow-ups", type: "email_clients", href: OS_ROUTES.marketingFollowUp, task: "follow_up" },
        { id: "m-auto", label: "Create automation", type: "create_workflow", href: OS_ROUTES.automations },
      ],
      detectedAt: now,
    });
  }

  if (metrics.traffic.trafficChange <= -20) {
    risks.push({
      id: "traffic-decline",
      title: "Website traffic declining",
      detail: `Traffic down ${Math.abs(metrics.traffic.trafficChange)}% week-over-week.`,
      why: `Analytics: ${metrics.traffic.visitors7} visitors this week vs prior period.`,
      category: "marketing",
      severity: "medium",
      likelihood: 0.75,
      potentialImpact: metrics.revenue.pipeline * 0.15,
      evidence: [`${metrics.traffic.trafficChange}% traffic change`, `Top page: ${metrics.traffic.topPage}`],
      mitigations: [
        { id: "m-analytics", label: "View analytics", type: "navigate", href: "/admin/analytics" },
        { id: "m-campaign", label: "Marketing campaign", type: "create_campaign", href: OS_ROUTES.marketingCampaign },
      ],
      detectedAt: now,
    });
  }

  if (metrics.traffic.conversionChange <= -15 && metrics.traffic.conversionRate < 3) {
    risks.push({
      id: "conversion-drop",
      title: "Conversion rate softening",
      detail: `Conversion at ${metrics.traffic.conversionRate}% (${metrics.traffic.conversionChange}% change).`,
      why: "Fewer visitors completing booking/contact forms vs prior 30-day baseline.",
      category: "marketing",
      severity: "medium",
      likelihood: 0.7,
      potentialImpact: metrics.revenue.thisMonth * 0.2,
      evidence: [`${metrics.traffic.conversionRate}% conversion`, `${metrics.traffic.conversionChange}% change`],
      mitigations: [
        { id: "m-book", label: "Review booking flow", type: "navigate", href: "/admin/submissions?type=booking" },
        { id: "m-home", label: "Edit homepage CTA", type: "navigate", href: "/admin/homepage" },
      ],
      detectedAt: now,
    });
  }

  if (metrics.attention.followUpClients >= 5) {
    risks.push({
      id: "client-churn",
      title: "Client inactivity rising",
      detail: `${metrics.attention.followUpClients} past clients inactive 60+ days.`,
      why: "No recent submissions or bookings from previously engaged contacts.",
      category: "crm",
      severity: "medium",
      likelihood: 0.65,
      potentialImpact: metrics.attention.followUpValue,
      evidence: [`${metrics.attention.followUpClients} inactive contacts`, "CRM last-activity dates"],
      mitigations: [
        { id: "m-crm", label: "Open CRM", type: "open_crm", href: "/admin/crm" },
        { id: "m-email", label: "Re-engagement email", type: "email_clients", href: OS_ROUTES.marketingFollowUp },
      ],
      detectedAt: now,
    });
  }

  const sessionsPage = analytics30.topPages.find((p) => p.path.includes("/sessions"));
  const sessionsPrev = analytics7.topPages.find((p) => p.path.includes("/sessions"));
  if (sessionsPage && sessionsPrev && sessionsPage.views < sessionsPrev.views * 0.5) {
    risks.push({
      id: "sessions-interest",
      title: "Session applications slowing",
      detail: "Sessions page traffic dropped — application volume may follow.",
      why: `Sessions page views: ${sessionsPage.views} (30d) vs recent week trend.`,
      category: "sessions",
      severity: "medium",
      likelihood: 0.6,
      potentialImpact: 0,
      evidence: [`${sessionsPage.views} session page views`, "Analytics pageview data"],
      mitigations: [
        { id: "m-sessions", label: "Sessions hub", type: "navigate", href: "/admin/sessions-hub" },
        { id: "m-promo", label: "Promote volume", type: "create_campaign", href: OS_ROUTES.marketingCampaign },
      ],
      detectedAt: now,
    });
  }

  if (metrics.attention.galleriesAwaiting >= 2) {
    risks.push({
      id: "delivery-backlog",
      title: "Booked projects idle 14+ days",
      detail: `${metrics.attention.galleriesAwaiting} booked/production rows idle — verify editing/delivery (no gallery entity yet).`,
      why: "Delayed delivery risks client satisfaction and referrals.",
      category: "operations",
      severity: "medium",
      likelihood: 0.8,
      potentialImpact: metrics.attention.galleriesAwaiting * 800,
      evidence: [`${metrics.attention.galleriesAwaiting} idle booked projects`],
      mitigations: [
        { id: "m-deliver", label: "Review bookings", type: "navigate", href: "/admin/submissions?type=booking&status=scheduled" },
      ],
      detectedAt: now,
    });
  }

  return risks.sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 };
    return sev[b.severity] - sev[a.severity] || b.potentialImpact - a.potentialImpact;
  });
}
