import { prisma } from "@/lib/db";
import { getAdminPipeline } from "@/lib/admin-os-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { writeMemory } from "./store";
import { getWorkspaceId } from "./workspace";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseBudgetValue(budget: string): number {
  const nums = budget.match(/\d[\d,]*/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [];
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (nums.length === 1) return nums[0];
  return 0;
}

function parseSubmissionData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function syncFinancialMemory() {
  const workspaceId = getWorkspaceId();
  const period = monthKey();
  let synced = 0;
  const layers = new Set<string>(["financial"]);

  const [metrics, pipeline, bookings, services] = await Promise.all([
    getOperatorMetrics(),
    getAdminPipeline(),
    prisma.submission.findMany({
      where: { type: "booking" },
      select: { status: true, data: true, createdAt: true },
    }),
    prisma.service.findMany({
      where: { published: true, archived: false },
      select: { slug: true, title: true, startingPrice: true },
    }),
  ]);

  const completed = bookings.filter(
    (b) => b.status === "completed" || b.status === "delivered" || b.status === "follow_up"
  );
  const open = bookings.filter((b) =>
    [
      "new",
      "contacted",
      "scheduled",
      "lead",
      "qualified",
      "discovery",
      "proposal",
      "booked",
      "planning",
      "production",
      "editing",
    ].includes(b.status)
  );

  let completedRevenue = 0;
  let openPipeline = 0;
  const packageCounts = new Map<string, number>();

  for (const b of completed) {
    const data = parseSubmissionData(b.data);
    const budget = typeof data.budgetRange === "string" ? data.budgetRange : "";
    completedRevenue += parseBudgetValue(budget) || 1200;
    const svc = String(data.serviceType || data.service || "general");
    packageCounts.set(svc, (packageCounts.get(svc) ?? 0) + 1);
  }

  for (const b of open) {
    const data = parseSubmissionData(b.data);
    const budget = typeof data.budgetRange === "string" ? data.budgetRange : "";
    openPipeline += parseBudgetValue(budget) || 1200;
  }

  await writeMemory({
    workspaceId,
    layer: "financial",
    category: "revenue",
    key: `revenue-${period}`,
    title: "Revenue & pipeline",
    summary: `~$${metrics.revenue.thisMonth.toLocaleString()} MTD · $${openPipeline.toLocaleString()} open pipeline · $${metrics.attention.followUpValue.toLocaleString()} at-risk`,
    value: {
      period,
      revenueMtd: metrics.revenue.thisMonth,
      revenueChange: metrics.revenue.monthChange,
      completedEstimate: completedRevenue,
      openPipeline,
      pipelineKanban: pipeline.totalValue,
      atRiskValue: metrics.attention.followUpValue,
      staleInquiries: metrics.attention.abandonedInquiries,
      overdueInvoices: metrics.attention.overdueInvoices,
    },
    confidence: 0.82,
    importance: 92,
    source: "sync",
    sourceRef: "bookings-pipeline",
  });
  synced += 1;

  const topPackages = [...packageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  await writeMemory({
    workspaceId,
    layer: "financial",
    category: "package_profitability",
    key: `packages-${period}`,
    title: "Package mix & profitability signals",
    summary: `${topPackages[0]?.[0] ?? "Portrait"} leads with ${topPackages[0]?.[1] ?? 0} completed bookings`,
    value: {
      packages: topPackages.map(([name, count]) => ({
        name,
        completedBookings: count,
        catalogPrice: services.find((s) => s.title.toLowerCase().includes(name.toLowerCase()))?.startingPrice,
      })),
      note: "Full invoice/expense tracking not yet connected — estimates from booking budgets",
    },
    confidence: 0.7,
    importance: 75,
    source: "sync",
    sourceRef: "submission-budgets",
  });
  synced += 1;

  if (metrics.attention.followUpValue > 0 || metrics.attention.abandonedInquiries > 0) {
    await writeMemory({
      workspaceId,
      layer: "financial",
      category: "risk",
      key: `risk-${period}`,
      title: "Financial risk flags",
      summary: `$${(metrics.attention.followUpValue + metrics.attention.abandonedInquiries * 1200).toLocaleString()} potentially lost without follow-up`,
      value: {
        inactiveClientValue: metrics.attention.followUpValue,
        staleInquiries: metrics.attention.abandonedInquiries,
        recommendedAction: "Recover stale inquiries within 48 hours",
      },
      confidence: 0.85,
      importance: 88,
      source: "sync",
      sourceRef: "operator-attention",
    });
    synced += 1;
  }

  return { synced, layers: [...layers] };
}
