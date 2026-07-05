import {
  getAdminCRMContacts,
  getAdminDashboardOS,
  getAdminInsights,
  getAdminPipeline,
  adminGlobalSearch,
} from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";
import type { AIToolDefinition } from "../types";

export const BUSINESS_TOOLS: AIToolDefinition[] = [
  {
    name: "get_business_snapshot",
    description: "Get high-level KPIs: bookings, leads, pipeline value, applications, conversion rate, pending tasks",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_crm_contacts",
    description: "List CRM contacts with status, bookings, revenue estimate, last activity. Optional limit.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: "Max contacts to return (default 20)" } },
      required: [],
    },
  },
  {
    name: "get_inactive_clients",
    description: "Find clients with no activity in N days (default 180)",
    parameters: {
      type: "object",
      properties: { days: { type: "number" } },
      required: [],
    },
  },
  {
    name: "get_analytics",
    description: "Website analytics: pageviews, conversions, top pages, traffic sources (last 30 days)",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_pipeline",
    description: "Booking pipeline kanban summary with total pipeline value",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_session_applications",
    description: "ÉLEVÉ Sessions application stats and recent applicants",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
      required: [],
    },
  },
  {
    name: "search_business",
    description: "Search clients, bookings, portfolio, sessions by keyword",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Search query" } },
      required: ["query"],
    },
  },
  {
    name: "get_portfolio_summary",
    description: "Published portfolio projects count and recent titles",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

export async function executeBusinessTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_business_snapshot": {
      const data = await getAdminDashboardOS();
      return JSON.stringify({
        metrics: data.metrics,
        leadSources: data.charts.leadSources.slice(0, 5),
        bookingsTrend: data.charts.bookingsByMonth,
      });
    }
    case "get_crm_contacts": {
      const limit = typeof args.limit === "number" ? args.limit : 20;
      const contacts = await getAdminCRMContacts();
      return JSON.stringify(contacts.slice(0, limit));
    }
    case "get_inactive_clients": {
      const days = typeof args.days === "number" ? args.days : 180;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const contacts = await getAdminCRMContacts();
      const inactive = contacts.filter((c) => new Date(c.lastActivity).getTime() < cutoff);
      return JSON.stringify({ count: inactive.length, clients: inactive.slice(0, 15) });
    }
    case "get_analytics": {
      const analytics = await getAnalyticsSummary(30);
      return JSON.stringify(analytics);
    }
    case "get_pipeline": {
      const pipeline = await getAdminPipeline();
      return JSON.stringify({
        totalValue: pipeline.totalValue,
        columns: pipeline.columns.map((c) => ({
          stage: c.label,
          count: c.items.length,
          value: c.items.reduce((s, i) => s + i.value, 0),
        })),
      });
    }
    case "get_session_applications": {
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const apps = await prisma.submission.findMany({
        where: { type: "session" },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, status: true, contactEmail: true, data: true, createdAt: true },
      });
      return JSON.stringify(
        apps.map((a) => {
          let name = "";
          try {
            const d = JSON.parse(a.data) as Record<string, unknown>;
            name = String(d.fullName || d.name || "");
          } catch {
            /* ignore */
          }
          return { name, email: a.contactEmail, status: a.status, createdAt: a.createdAt };
        })
      );
    }
    case "search_business": {
      const query = String(args.query || "");
      const results = await adminGlobalSearch(query);
      return JSON.stringify(results);
    }
    case "get_portfolio_summary": {
      const items = await prisma.portfolioItem.findMany({
        where: { published: true, archived: false },
        orderBy: { sortOrder: "asc" },
        take: 12,
        select: { title: true, slug: true, category: true },
      });
      const total = await prisma.portfolioItem.count({ where: { published: true, archived: false } });
      return JSON.stringify({ total, recent: items });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

/** Build compact business context injected when tools aren't available */
export async function buildBusinessContextSnapshot(): Promise<string> {
  const [dashboard, insights, analytics] = await Promise.all([
    getAdminDashboardOS(),
    getAdminInsights(),
    getAnalyticsSummary(30),
  ]);
  return JSON.stringify({
    metrics: dashboard.metrics,
    insights: insights.insights.slice(0, 5),
    analytics: {
      pageviews: analytics.totals.pageviews,
      conversionRate: analytics.totals.conversionRate,
      topPages: analytics.topPages.slice(0, 5),
      topSources: analytics.topSources.slice(0, 5),
    },
  });
}
