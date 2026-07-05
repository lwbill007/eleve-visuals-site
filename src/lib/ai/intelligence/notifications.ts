import { getAdminDashboardOS, getAdminInsights, getAdminCRMContacts } from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import type { AINotificationItem } from "../types";

export async function evaluateAINotifications(): Promise<AINotificationItem[]> {
  const [dashboard, insights, analytics, crm, existing] = await Promise.all([
    getAdminDashboardOS(),
    getAdminInsights(),
    getAnalyticsSummary(30),
    getAdminCRMContacts(),
    prisma.aINotification.findMany({
      where: { dismissed: false, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { type: true, title: true },
    }),
  ]);

  const existingKeys = new Set(existing.map((n) => `${n.type}:${n.title}`));
  const candidates: AINotificationItem[] = [];

  function add(item: AINotificationItem) {
    const key = `${item.type}:${item.title}`;
    if (existingKeys.has(key)) return;
    candidates.push(item);
  }

  if (dashboard.metrics.monthlyGrowth <= -15) {
    add({
      type: "revenue_drop",
      severity: "high",
      title: `Revenue pipeline down ${Math.abs(dashboard.metrics.monthlyGrowth)}%`,
      detail: "Bookings slowed significantly vs last month. Review pricing and outreach.",
      href: "/admin/analytics",
      metric: `${dashboard.metrics.monthlyGrowth}%`,
    });
  } else if (dashboard.metrics.monthlyGrowth >= 20) {
    add({
      type: "revenue_up",
      severity: "low",
      title: `Booking rate up ${dashboard.metrics.monthlyGrowth}%`,
      detail: "Strong momentum — capitalize with portfolio features and email campaign.",
      href: "/admin/marketing",
      metric: `+${dashboard.metrics.monthlyGrowth}%`,
    });
  }

  if (dashboard.metrics.applications.pending > 8) {
    add({
      type: "applications_slow",
      severity: "medium",
      title: `${dashboard.metrics.applications.pending} applications awaiting review`,
      detail: "Backlog may hurt acceptance experience. Prioritize reviews today.",
      href: "/admin/applications",
      metric: String(dashboard.metrics.applications.pending),
    });
  }

  const vipReturns = crm.filter((c) => {
    const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
    return c.status === "vip" && days < 7;
  });
  if (vipReturns.length > 0) {
    add({
      type: "vip_return",
      severity: "low",
      title: `VIP client${vipReturns.length === 1 ? "" : "s"} active this week`,
      detail: `${vipReturns[0]?.name || vipReturns[0]?.email} — personalize outreach.`,
      href: `/admin/crm/${encodeURIComponent(vipReturns[0]?.email ?? "")}`,
      metric: String(vipReturns.length),
    });
  }

  const inactive = crm.filter((c) => {
    const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
    return days > 120 && c.revenue > 1000;
  });
  if (inactive.length >= 3) {
    add({
      type: "client_inactive",
      severity: "medium",
      title: `${inactive.length} high-value clients inactive 120+ days`,
      detail: "Launch re-engagement before they churn permanently.",
      href: "/admin/crm",
      metric: String(inactive.length),
    });
  }

  const staleBookings = await prisma.submission.count({
    where: {
      type: "booking",
      status: "new",
      read: false,
      createdAt: { lt: new Date(Date.now() - 5 * 86400000) },
    },
  });
  if (staleBookings >= 2) {
    add({
      type: "abandoned_booking",
      severity: "high",
      title: `${staleBookings} abandoned booking inquiries`,
      detail: "Unread inquiries older than 5 days. Send recovery follow-up.",
      href: "/admin/pipeline",
      metric: String(staleBookings),
    });
  }

  if (analytics.totals.conversionRate >= 5) {
    add({
      type: "conversion_spike",
      severity: "low",
      title: "Conversion rate performing well",
      detail: `${analytics.totals.conversionRate}% conversion — replicate what's working on homepage.`,
      href: "/admin/analytics",
      metric: `${analytics.totals.conversionRate}%`,
    });
  }

  for (const insight of insights.insights.filter((i) => i.severity === "high").slice(0, 2)) {
    add({
      type: "insight",
      severity: insight.severity,
      title: insight.title,
      detail: insight.detail,
      href: insight.href,
      metric: "",
    });
  }

  return candidates;
}

export async function syncAINotifications(): Promise<number> {
  const candidates = await evaluateAINotifications();
  if (candidates.length === 0) return 0;

  await prisma.aINotification.createMany({
    data: candidates.map((c) => ({
      type: c.type,
      severity: c.severity,
      title: c.title,
      detail: c.detail,
      href: c.href,
      metric: c.metric,
    })),
  });

  return candidates.length;
}

export async function getAINotifications(unreadOnly = false) {
  await syncAINotifications().catch(() => {});

  return prisma.aINotification.findMany({
    where: {
      dismissed: false,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function markAINotificationRead(id: string) {
  await prisma.aINotification.update({ where: { id }, data: { read: true } });
}

export async function dismissAINotification(id: string) {
  await prisma.aINotification.update({ where: { id }, data: { dismissed: true, read: true } });
}
