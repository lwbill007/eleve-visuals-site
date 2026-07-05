import { getAdminCRMContacts, getAdminDashboardOS, getAdminPipeline } from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { getSiteConfig, getServices } from "@/lib/content";
import { linkMemories } from "./graph";
import { writeMemory } from "./store";
import type { MemoryLayer } from "./types";
import { getWorkspaceId } from "./workspace";
import { syncCreativeMemory } from "./sync-creative";
import { syncMarketingMemory } from "./sync-marketing";
import { syncFinancialMemory } from "./sync-financial";
import { syncSponsorMemory } from "./sync-sponsor";
import { syncSessionsMemory } from "./sync-sessions";
import { runLearningPass } from "./sync-learning";

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function syncBusinessMemory(): Promise<{ synced: number; layers: string[] }> {
  const now = new Date();
  const period = monthKey(now);
  let synced = 0;
  const layers = new Set<string>();

  const [metrics, dashboard, pipeline, analytics30, crm] = await Promise.all([
    getOperatorMetrics(),
    getAdminDashboardOS(),
    getAdminPipeline(),
    getAnalyticsSummary(30),
    getAdminCRMContacts(),
  ]);

  const businessSnapshot = await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "business",
    category: "snapshot",
    key: `monthly-${period}`,
    title: `Business snapshot · ${period}`,
    summary: `${metrics.month.bookings} bookings · $${metrics.revenue.thisMonth.toLocaleString()} pipeline · ${metrics.traffic.conversionRate}% conversion`,
    value: {
      period,
      revenue: metrics.revenue,
      month: metrics.month,
      today: metrics.today,
      traffic: metrics.traffic,
      attention: metrics.attention,
      returningClients: dashboard.metrics.returningClients,
      pipelineValue: pipeline.totalValue,
    },
    confidence: 0.95,
    importance: 90,
    source: "sync",
    sourceRef: "business-operator",
  });
  synced += 1;
  layers.add("business");

  const analyticsMemory = await writeMemory({
    layer: "marketing",
    category: "analytics",
    key: `traffic-30d-${period}`,
    title: "Website traffic · 30 days",
    summary: `${analytics30.totals.pageviews} pageviews · ${analytics30.totals.conversionRate}% conversion · top: ${analytics30.topPages[0]?.path ?? "/"}`,
    value: {
      pageviews: analytics30.totals.pageviews,
      uniqueSessions: analytics30.totals.uniqueSessions,
      conversionRate: analytics30.totals.conversionRate,
      topPages: analytics30.topPages.slice(0, 5),
      topSources: analytics30.topSources.slice(0, 5),
    },
    confidence: 0.9,
    importance: 75,
    source: "sync",
    sourceRef: "analytics-server",
  });
  synced += 1;
  layers.add("marketing");

  await writeMemory({
    layer: "financial",
    category: "pipeline",
    key: `pipeline-${period}`,
    title: "Pipeline value",
    summary: `$${pipeline.totalValue.toLocaleString()} estimated from open bookings`,
    value: {
      totalValue: pipeline.totalValue,
      columns: pipeline.columns.map((c) => ({ id: c.id, label: c.label, count: c.items.length })),
    },
    confidence: 0.85,
    importance: 80,
    source: "sync",
    sourceRef: "admin-pipeline",
  });
  synced += 1;
  layers.add("financial");

  // Brand memory from site config
  try {
    const site = await getSiteConfig();
    await writeMemory({
      layer: "brand",
      category: "identity",
      key: "site-config",
      title: "ÉLEVÉ brand identity",
      summary: `${site.name} — ${site.tagline}`,
      value: {
        name: site.name,
        tagline: site.tagline,
        description: site.description,
        email: site.email,
        instagram: site.instagram,
        location: site.location,
      },
      confidence: 1,
      importance: 95,
      source: "sync",
      sourceRef: "site-content",
      verified: true,
    });
    synced += 1;
    layers.add("brand");
  } catch {
    /* DB may be unavailable during build */
  }

  // CRM relationship profiles (top contacts by revenue)
  const topClients = [...crm].sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  for (const client of topClients) {
    const mem = await writeMemory({
      layer: "crm",
      category: "client_profile",
      key: client.email,
      title: client.name || client.email,
      summary: `${client.status} · ${client.bookings} bookings · $${client.revenue.toLocaleString()} · last active ${client.lastActivity}`,
      value: {
        email: client.email,
        name: client.name,
        status: client.status,
        bookings: client.bookings,
        revenue: client.revenue,
        tags: client.tags,
        source: client.source,
        lastActivity: client.lastActivity,
      },
      confidence: 0.88,
      importance: client.revenue > 2000 ? 85 : 60,
      source: "sync",
      sourceRef: `crm:${client.email}`,
    });
    synced += 1;
    layers.add("crm");

    if (businessSnapshot.id && mem.id) {
      await linkMemories(mem.id, businessSnapshot.id, "contributes_to_revenue", client.revenue / 1000).catch(
        () => {}
      );
    }
  }

  if (analyticsMemory.id && businessSnapshot.id) {
    await linkMemories(analyticsMemory.id, businessSnapshot.id, "informs", 1).catch(() => {});
  }

  return { synced, layers: [...layers] };
}

export async function syncBrandFromServices() {
  const services = await getServices();
  let synced = 0;
  for (const s of services.slice(0, 12)) {
    await writeMemory({
      workspaceId: getWorkspaceId(),
      layer: "brand",
      category: "package",
      key: s.slug,
      title: s.title,
      summary: `${s.tagline} · from ${s.startingPrice}`,
      value: {
        slug: s.slug,
        title: s.title,
        tagline: s.tagline,
        startingPrice: s.startingPrice,
        description: s.description.slice(0, 400),
      },
      confidence: 1,
      importance: 70,
      source: "sync",
      sourceRef: `service:${s.slug}`,
      verified: true,
    });
    synced += 1;
  }
  return { synced, layers: ["brand"] };
}

export async function syncAllMemories() {
  const results = await Promise.all([
    syncBusinessMemory(),
    syncCreativeMemory(),
    syncMarketingMemory(),
    syncFinancialMemory(),
    syncSponsorMemory(),
    syncSessionsMemory(),
    syncBrandFromServices().catch(() => ({ synced: 0, layers: [] as string[] })),
  ]);

  const learning = await runLearningPass().catch(() => ({ recorded: 0 }));

  const synced = results.reduce((s, r) => s + r.synced, 0);
  const layers = [...new Set(results.flatMap((r) => r.layers))];

  return { synced, layers, learning };
}

export function layerForInsightCategory(category: string): MemoryLayer {
  const map: Record<string, MemoryLayer> = {
    sales: "business",
    marketing: "marketing",
    crm: "crm",
    sessions: "sessions",
    operations: "operational",
  };
  return map[category] ?? "operational";
}
