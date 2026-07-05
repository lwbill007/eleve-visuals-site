import { getOperatorMetrics } from "../../intelligence/business-operator";
import { getAdminDashboardOS } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildOperationsBrief(): Promise<ExecutiveRoleBrief> {
  const [metrics, dashboard, automations] = await Promise.all([
    getOperatorMetrics(),
    getAdminDashboardOS(),
    prisma.aIAutomation.count({ where: { enabled: true } }).catch(() => 0),
  ]);

  const opsScore = Math.min(
    100,
    Math.max(10, 100 - metrics.attention.tasks * 8 - metrics.attention.galleriesAwaiting * 5)
  );

  return {
    id: "operations",
    title: ROLE_META.operations.title,
    mission: ROLE_META.operations.mission,
    healthScore: opsScore,
    confidence: 0.9,
    topPriority:
      metrics.attention.galleriesAwaiting > 0
        ? `Deliver ${metrics.attention.galleriesAwaiting} pending galleries`
        : metrics.attention.tasks > 3
          ? `Clear ${metrics.attention.tasks} pending admin tasks`
          : "Capacity available for growth initiatives",
    insights: [
      { text: `${metrics.attention.tasks} pending tasks`, kind: "fact" },
      { text: `${metrics.attention.galleriesAwaiting} galleries awaiting delivery`, kind: "fact" },
      { text: `${automations} active automations`, kind: "fact" },
      {
        text: `${dashboard.metrics.applications.pending} session applications pending review`,
        kind: metrics.attention.tasks > 5 ? "suggestion" : "fact",
      },
    ],
    recommendations: [
      ...(metrics.attention.galleriesAwaiting > 0
        ? [
            {
              id: "ops-galleries",
              title: "Gallery delivery backlog",
              detail: `${metrics.attention.galleriesAwaiting} clients waiting on deliverables`,
              why: "Delayed delivery hurts satisfaction and referrals",
              kind: "suggestion" as const,
              confidence: 0.92,
              expectedImpact: "Client satisfaction + retention",
              actions: [
                { id: "submissions", label: "View Bookings", type: "navigate" as const, href: "/admin/submissions?type=booking" },
              ],
            },
          ]
        : []),
      {
        id: "ops-automate",
        title: "Automate follow-up sequences",
        detail: "Reduce manual CRM touchpoints with booking inquiry workflows",
        why: `${metrics.attention.abandonedInquiries} stale inquiries could be automated`,
        kind: "suggestion",
        confidence: 0.75,
        expectedImpact: "Save 20+ min/day",
        actions: [
          { id: "automations", label: "Automations", type: "navigate" as const, href: "/admin/automations" },
        ],
      },
    ],
    metrics: [
      { label: "Tasks", value: String(metrics.attention.tasks), source: "Dashboard" },
      { label: "Galleries", value: String(metrics.attention.galleriesAwaiting), source: "Submissions" },
      { label: "Automations", value: String(automations), source: "AIAutomation" },
      { label: "Applications", value: String(dashboard.metrics.applications.pending), source: "Sessions" },
    ],
    href: ROLE_META.operations.href,
  };
}
