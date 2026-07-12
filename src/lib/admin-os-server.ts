import { prisma } from "./db";
import { getAnalyticsSummary } from "./analytics-server";
import { getCached, setCache } from "./ai/cache";
import { normalizeApplicationStatus } from "./types";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function lastNMonths(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function parseSubmissionData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseName(data: Record<string, unknown>): string {
  return (
    (typeof data.fullName === "string" && data.fullName) ||
    (typeof data.name === "string" && data.name) ||
    ""
  );
}

import { estimateBudgetValue } from "@/lib/estimate-budget";
import { PIPELINE_STAGES, normalizeInquiryStatus } from "@/lib/booking-pipeline";

function parseEmail(data: Record<string, unknown>, fallback: string): string {
  return (typeof data.email === "string" && data.email) || fallback;
}

function inferCrmSegment(data: Record<string, unknown>): string {
  const pkg = typeof data.packageId === "string" ? data.packageId : "";
  const cat = typeof data.projectCategory === "string" ? data.projectCategory : "";
  if (/reserve|legacy/i.test(pkg)) return "Creative Partner";
  if (/event/i.test(cat)) return "Event";
  if (/business|ascend|apex|brand/i.test(`${pkg} ${cat}`)) return "Business";
  if (/hybrid|fusion|video|motion|cinema|films/i.test(`${pkg} ${cat}`)) return "Brand";
  return "Portrait";
}

export async function getAdminDashboardOS() {
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthKeys = lastNMonths(6);

  const [
    bookings,
    applications,
    contacts,
    submissions90,
    pageviews90,
    conversions90,
    portfolioCount,
    sessions,
    openApplications,
    unread,
    recentSubmissions,
    recentActivity,
    returningBookingRows,
  ] = await Promise.all([
    prisma.submission.findMany({ where: { type: "booking" }, select: { status: true, data: true, createdAt: true, contactEmail: true } }),
    prisma.submission.findMany({ where: { type: "session" }, select: { status: true, createdAt: true } }),
    prisma.submission.count({ where: { type: "contact" } }),
    prisma.submission.findMany({
      where: { createdAt: { gte: since90 } },
      select: { type: true, status: true, createdAt: true, data: true, contactEmail: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { type: "pageview", createdAt: { gte: since90 } },
      select: { createdAt: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { type: "conversion", createdAt: { gte: since90 } },
      select: { conversionType: true, createdAt: true },
    }),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
    prisma.sessionVolume.count({ where: { published: true, archived: false } }),
    prisma.sessionVolume.count({ where: { published: true, status: "applications_open", archived: false } }),
    prisma.submission.count({ where: { read: false } }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, type: true, status: true, read: true, data: true, contactEmail: true, createdAt: true },
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, target: true, createdAt: true } }),
    prisma.submission.findMany({
      where: { type: "booking", contactEmail: { not: "" } },
      select: { contactEmail: true, status: true },
    }),
  ]);

  const completedByEmail = new Map<string, number>();
  for (const row of returningBookingRows) {
    if (row.status === "completed" && row.contactEmail) {
      completedByEmail.set(row.contactEmail, (completedByEmail.get(row.contactEmail) ?? 0) + 1);
    }
  }
  let returningClients = 0;
  for (const count of completedByEmail.values()) {
    if (count > 1) returningClients += 1;
  }

  const bookingsByMonth = new Map(monthKeys.map((k) => [k, 0]));
  const applicationsByMonth = new Map(monthKeys.map((k) => [k, 0]));
  const leadsByMonth = new Map(monthKeys.map((k) => [k, 0]));
  const visitorsByMonth = new Map(monthKeys.map((k) => [k, 0]));
  let pipelineValue = 0;

  for (const b of bookings) {
    const key = monthKey(b.createdAt);
    if (bookingsByMonth.has(key)) bookingsByMonth.set(key, (bookingsByMonth.get(key) ?? 0) + 1);
    if (["new", "contacted", "scheduled"].includes(b.status)) {
      const data = parseSubmissionData(b.data);
      const budget = typeof data.budgetRange === "string" ? data.budgetRange : "";
      pipelineValue += estimateBudgetValue(budget) || 1200;
    }
  }

  for (const a of applications) {
    const key = monthKey(a.createdAt);
    if (applicationsByMonth.has(key)) applicationsByMonth.set(key, (applicationsByMonth.get(key) ?? 0) + 1);
  }

  for (const s of submissions90) {
    const key = monthKey(s.createdAt);
    if (leadsByMonth.has(key)) leadsByMonth.set(key, (leadsByMonth.get(key) ?? 0) + 1);
  }

  for (const pv of pageviews90) {
    const key = monthKey(pv.createdAt);
    if (visitorsByMonth.has(key)) visitorsByMonth.set(key, (visitorsByMonth.get(key) ?? 0) + 1);
  }

  const bookingsThisMonth = bookings.filter((b) => b.createdAt >= since30).length;
  const bookingsLastMonth = bookings.filter((b) => {
    const d = b.createdAt;
    const start = new Date(since30.getFullYear(), since30.getMonth() - 1, 1);
    const end = since30;
    return d >= start && d < end;
  }).length;
  const bookingGrowth =
    bookingsLastMonth > 0
      ? Math.round(((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100)
      : bookingsThisMonth > 0
        ? 100
        : 0;

  const visitors30 = pageviews90.filter((p) => p.createdAt >= since30).length;
  const visitors7 = pageviews90.filter((p) => p.createdAt >= since7).length;
  const conversions30 = conversions90.filter((c) => c.createdAt >= since30).length;
  const conversionRate = visitors30 > 0 ? Math.round((conversions30 / visitors30) * 1000) / 10 : 0;

  const pendingTasks =
    bookings.filter((b) => ["new", "contacted"].includes(b.status)).length +
    applications.filter((a) => normalizeApplicationStatus(a.status) === "pending_review").length +
    unread;

  const uniqueEmails = new Set(
    bookings.map((b) => b.contactEmail || parseEmail(parseSubmissionData(b.data), "")).filter(Boolean)
  );

  const activityFeed = recentSubmissions.map((item) => {
    const data = parseSubmissionData(item.data);
    const name = parseName(data) || item.contactEmail;
    let kind = "submission";
    let label = "New submission";
    if (item.type === "booking") {
      kind = "booking";
      label = "New booking inquiry";
    } else if (item.type === "session") {
      kind = "application";
      label = "Session application received";
    } else if (item.type === "contact") {
      kind = "contact";
      label = "Contact form submitted";
    }
    return {
      id: item.id,
      kind,
      label,
      name,
      status: item.status,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
      href:
        item.type === "session"
          ? `/admin/applications`
          : `/admin/submissions?type=${item.type}`,
    };
  });

  const leadSources = new Map<string, number>();
  for (const b of bookings) {
    const data = parseSubmissionData(b.data);
    const source =
      (typeof data.referralSource === "string" && data.referralSource) ||
      (typeof data.howDidYouHear === "string" && data.howDidYouHear) ||
      "Direct";
    leadSources.set(source, (leadSources.get(source) ?? 0) + 1);
  }

  return {
    metrics: {
      revenue: { value: pipelineValue, label: "Pipeline value", hint: "Estimated from open booking budgets" },
      bookings: { value: bookings.length, pending: bookings.filter((b) => ["new", "contacted"].includes(b.status)).length },
      leads: { value: bookings.length + applications.length + contacts, thisMonth: submissions90.filter((s) => s.createdAt >= since30).length },
      visitors: { value: visitors30, week: visitors7 },
      subscribers: { value: uniqueEmails.size, label: "Unique contacts" },
      applications: { value: applications.length, pending: applications.filter((a) => normalizeApplicationStatus(a.status) === "pending_review").length },
      returningClients,
      conversionRate,
      monthlyGrowth: bookingGrowth,
      pendingTasks,
      portfolio: portfolioCount,
      sessions,
      openApplications,
    },
    charts: {
      bookingsByMonth: monthKeys.map((k) => ({ month: monthLabel(k), value: bookingsByMonth.get(k) ?? 0 })),
      applicationsByMonth: monthKeys.map((k) => ({ month: monthLabel(k), value: applicationsByMonth.get(k) ?? 0 })),
      leadsByMonth: monthKeys.map((k) => ({ month: monthLabel(k), value: leadsByMonth.get(k) ?? 0 })),
      visitorsByMonth: monthKeys.map((k) => ({ month: monthLabel(k), value: visitorsByMonth.get(k) ?? 0 })),
      leadSources: [...leadSources.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([source, count]) => ({ source, count })),
    },
    activityFeed,
    systemActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      target: a.target,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function getAdminDashboardOSCached(force = false) {
  const cacheKey = "admin-dashboard-os-v1";
  if (!force) {
    const cached = await getCached<Awaited<ReturnType<typeof getAdminDashboardOS>>>(cacheKey);
    if (cached) return cached;
  }
  const data = await getAdminDashboardOS();
  await setCache(cacheKey, data, 10 * 60 * 1000);
  return data;
}

export async function getAdminCRMContacts() {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, status: true, data: true, contactEmail: true, createdAt: true, notes: true },
  });

  const byEmail = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      instagram: string;
      source: string;
      tags: string[];
      status: string;
      bookings: number;
      applications: number;
      contacts: number;
      revenue: number;
      lastActivity: string;
      notes: string;
    }
  >();

  for (const row of submissions) {
    const data = parseSubmissionData(row.data);
    const email = (row.contactEmail || parseEmail(data, "")).toLowerCase().trim();
    if (!email) continue;

    const existing = byEmail.get(email) ?? {
      id: email,
      name: parseName(data),
      email,
      phone: typeof data.phone === "string" ? data.phone : "",
      instagram: typeof data.instagram === "string" ? data.instagram : "",
      source:
        (typeof data.referralSource === "string" && data.referralSource) ||
        (typeof data.howDidYouHear === "string" && data.howDidYouHear) ||
        "Website",
      tags: [] as string[],
      status: "lead",
      bookings: 0,
      applications: 0,
      contacts: 0,
      revenue: 0,
      lastActivity: row.createdAt.toISOString(),
      notes: "",
    };

    if (parseName(data)) existing.name = parseName(data);
    if (typeof data.phone === "string" && data.phone) existing.phone = data.phone;
    if (typeof data.instagram === "string" && data.instagram) existing.instagram = data.instagram;
    if (row.notes) existing.notes = row.notes;
    if (row.createdAt.toISOString() > existing.lastActivity) existing.lastActivity = row.createdAt.toISOString();

    if (row.type === "booking") {
      existing.bookings += 1;
      const stage = normalizeInquiryStatus(row.status);
      const q = data.qualification as
        | { crmSegment?: string; estimatedProjectValue?: number; packageName?: string }
        | undefined;
      const segment =
        (typeof q?.crmSegment === "string" && q.crmSegment) ||
        inferCrmSegment(data);
      if (segment && !existing.tags.includes(segment)) existing.tags.push(segment);

      if (typeof q?.packageName === "string" && q.packageName && !existing.tags.includes(q.packageName)) {
        existing.tags.push(q.packageName);
      }

      if (stage === "delivered" || stage === "follow_up") {
        const value =
          (typeof q?.estimatedProjectValue === "number" && q.estimatedProjectValue) ||
          estimateBudgetValue(
            String(data.budgetRange ?? ""),
            typeof data.packageId === "string" ? data.packageId : undefined,
            Array.isArray(data.addOnIds) ? (data.addOnIds as string[]) : undefined
          ) ||
          1500;
        existing.revenue += value;
        existing.status = existing.bookings > 1 ? "repeat" : "completed";
        if (existing.bookings > 1 && !existing.tags.includes("Repeat Client")) {
          existing.tags.push("Repeat Client");
        }
      } else if (stage === "booked" || stage === "planning" || stage === "production" || stage === "editing") {
        existing.status = "booked";
      } else if (stage === "discovery" || stage === "proposal" || stage === "qualified") {
        existing.status = "interested";
      }
    } else if (row.type === "session") {
      existing.applications += 1;
      existing.tags.push("Sessions");
    } else {
      existing.contacts += 1;
    }

    if (existing.bookings > 1) {
      existing.status = "vip";
      if (!existing.tags.includes("VIP")) existing.tags.push("VIP");
      if (!existing.tags.includes("Repeat Client")) existing.tags.push("Repeat Client");
    }

    byEmail.set(email, existing);
  }

  return [...byEmail.values()].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export async function getAdminPipeline() {
  const bookings = await prisma.submission.findMany({
    where: { type: "booking" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, data: true, contactEmail: true, createdAt: true, updatedAt: true },
  });

  const columns = PIPELINE_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    items: bookings
      .filter((b) => normalizeInquiryStatus(b.status) === stage.id)
      .map((b) => {
        const data = parseSubmissionData(b.data);
        const budget = typeof data.budgetRange === "string" ? data.budgetRange : "";
        const q = data.qualification as
          | { estimatedProjectValue?: number; packageName?: string; leadScore?: number; priority?: string }
          | undefined;
        const category =
          (typeof q?.packageName === "string" && q.packageName) ||
          (typeof data.projectCategory === "string" && data.projectCategory) ||
          (Array.isArray(data.serviceTypes) && (data.serviceTypes as string[])[0]) ||
          (typeof data.serviceType === "string" ? data.serviceType : "");
        return {
          id: b.id,
          name: parseName(data) || b.contactEmail || "Unknown",
          email: b.contactEmail || parseEmail(data, ""),
          service: category,
          value:
            (typeof q?.estimatedProjectValue === "number" && q.estimatedProjectValue) ||
            estimateBudgetValue(
              budget,
              typeof data.packageId === "string" ? data.packageId : undefined,
              Array.isArray(data.addOnIds) ? (data.addOnIds as string[]) : undefined
            ) ||
            0,
          valueQuality: "estimated" as const,
          leadScore: typeof q?.leadScore === "number" ? q.leadScore : undefined,
          priority: typeof q?.priority === "string" ? q.priority : undefined,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
          ageDays: Math.floor((Date.now() - b.updatedAt.getTime()) / 86400000),
          status: normalizeInquiryStatus(b.status),
        };
      }),
  }));

  const totalValue = columns.reduce(
    (sum, col) => sum + col.items.reduce((s, i) => s + i.value, 0),
    0
  );

  return { columns, totalValue };
}

export async function getAdminInsights() {
  const { getLegacyInsightsFromOperator } = await import("@/lib/ai/intelligence/business-operator");
  return getLegacyInsightsFromOperator();
}

export async function adminGlobalSearch(q: string) {
  const query = q.trim().toLowerCase();
  if (!query || query.length < 2) return { results: [] };

  const [submissions, portfolio, sessions, services] = await Promise.all([
    prisma.submission.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, data: true, contactEmail: true, status: true },
    }),
    prisma.portfolioItem.findMany({
      where: { OR: [{ title: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] },
      take: 8,
      select: { id: true, title: true, slug: true },
    }),
    prisma.sessionVolume.findMany({
      where: { OR: [{ title: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }] },
      take: 8,
      select: { id: true, title: true, slug: true, volumeNumber: true },
    }),
    prisma.service.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      take: 6,
      select: { id: true, title: true, slug: true },
    }),
  ]);

  const results: { id: string; label: string; sub: string; href: string; category: string }[] = [];

  for (const s of submissions) {
    const data = parseSubmissionData(s.data);
    const name = parseName(data);
    const email = s.contactEmail || parseEmail(data, "");
    const haystack = `${name} ${email} ${s.type} ${s.status}`.toLowerCase();
    if (!haystack.includes(query)) continue;
    results.push({
      id: s.id,
      label: name || email || "Submission",
      sub: `${s.type} · ${s.status}`,
      href: s.type === "session" ? "/admin/applications" : `/admin/submissions?type=${s.type}`,
      category: s.type === "session" ? "Applications" : s.type === "booking" ? "Bookings" : "Contacts",
    });
  }

  for (const p of portfolio) {
    results.push({
      id: p.id,
      label: p.title,
      sub: "Portfolio",
      href: "/admin/portfolio",
      category: "Portfolio",
    });
  }

  for (const v of sessions) {
    results.push({
      id: v.id,
      label: `Vol. ${v.volumeNumber} — ${v.title}`,
      sub: "ÉLEVÉ Sessions",
      href: "/admin/sessions",
      category: "Sessions",
    });
  }

  for (const s of services) {
    results.push({
      id: s.id,
      label: s.title,
      sub: "Service",
      href: "/admin/services",
      category: "Services",
    });
  }

  return { results: results.slice(0, 20) };
}

export async function getSponsorMetrics() {
  const [analytics, dashboard, applications] = await Promise.all([
    getAnalyticsSummary(30),
    getAdminDashboardOS(),
    prisma.submission.count({ where: { type: "session" } }),
  ]);

  return {
    websiteTraffic: analytics.totals.pageviews,
    uniqueVisitors: analytics.totals.uniqueSessions,
    conversionRate: analytics.totals.conversionRate,
    emailGrowth: dashboard.metrics.subscribers.value,
    applicationGrowth: applications,
    sessionVolumes: dashboard.metrics.sessions,
    topSources: analytics.topSources,
    conversions: analytics.conversions,
    generatedAt: new Date().toISOString(),
  };
}
