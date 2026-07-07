import { getOperatorMetrics } from "../intelligence/business-operator";
import { getEmbeddingStats } from "../memory/embeddings";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { prisma } from "@/lib/db";
import type { UnknownItem } from "./types";

export async function buildUnknowns(): Promise<UnknownItem[]> {
  const workspaceId = getWorkspaceId();
  const [metrics, embeddings, lowConf, stale, memoryTotal] = await Promise.all([
    getOperatorMetrics(),
    getEmbeddingStats(),
    searchMemories({ workspaceId, limit: 200 }).then((r) =>
      r.items.filter((m) => m.confidence < 0.5 && !m.archived)
    ),
    prisma.aIMemory.count({
      where: {
        workspaceId,
        archived: false,
        updatedAt: { lt: new Date(Date.now() - 90 * 86400000) },
      },
    }),
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
  ]);

  const unknowns: UnknownItem[] = [];

  unknowns.push({
    id: "ga4",
    category: "analytics",
    title: "Google Analytics 4 not connected",
    detail: "Traffic attribution relies on first-party pageview events only",
    severity: "high",
    howToResolve: "Connect GA4 property and import historical baselines",
    blocksDecisions: ["Channel ROI", "Campaign attribution", "Audience demographics"],
  });

  unknowns.push({
    id: "search-console",
    category: "seo",
    title: "Search Console not synced",
    detail: "SEO opportunities inferred from on-page scan, not search performance data",
    severity: "medium",
    howToResolve: "Connect Google Search Console API",
    blocksDecisions: ["Keyword strategy", "Organic traffic forecasts"],
  });

  unknowns.push({
    id: "ad-spend",
    category: "marketing",
    title: "Paid ad spend not tracked",
    detail: "Cannot calculate true CAC or paid channel ROI",
    severity: "high",
    howToResolve: "Connect Meta/Google Ads or log spend manually",
    blocksDecisions: ["Marketing budget allocation", "CAC optimization"],
  });

  unknowns.push({
    id: "expenses",
    category: "finance",
    title: "Expense ledger incomplete",
    detail: "Profit and cash flow predictions use revenue proxies only",
    severity: "medium",
    howToResolve: "Import expenses or connect accounting software",
    blocksDecisions: ["Profit forecasts", "Pricing margin analysis"],
  });

  if (metrics.traffic.conversionRate === 0 && metrics.traffic.visitors30 > 0) {
    unknowns.push({
      id: "conversion-tracking",
      category: "analytics",
      title: "Conversion events may be under-tracked",
      detail: "Traffic exists but conversion rate reads 0% — verify booking form events",
      severity: "high",
      howToResolve: "Audit analytics events on /book funnel",
      blocksDecisions: ["Funnel optimization", "Page conversion scores"],
    });
  }

  if (embeddings.chunks < memoryTotal * 0.3) {
    unknowns.push({
      id: "embeddings",
      category: "memory",
      title: "Semantic index incomplete",
      detail: `${embeddings.chunks} chunks indexed vs ${memoryTotal} memories — retrieval gaps likely`,
      severity: "medium",
      howToResolve: "Run embedding reindex from cognitive refresh",
      blocksDecisions: ["Semantic recall", "Cross-memory pattern detection"],
    });
  }

  if (lowConf.length > 5) {
    unknowns.push({
      id: "low-confidence",
      category: "memory",
      title: `${lowConf.length} low-confidence memories`,
      detail: "These memories influence recommendations but lack verification",
      severity: "medium",
      howToResolve: "Review and verify or archive low-confidence entries",
      blocksDecisions: ["Recommendation confidence", "Institutional knowledge trust"],
    });
  }

  if (stale > 10) {
    unknowns.push({
      id: "stale",
      category: "memory",
      title: `${stale} memories not updated in 90+ days`,
      detail: "Stale knowledge may contradict current business state",
      severity: "low",
      howToResolve: "Run Refresh Executive Intelligence to update or archive",
      blocksDecisions: ["Historical comparisons", "Trend analysis"],
    });
  }

  unknowns.push({
    id: "instagram-api",
    category: "social",
    title: "Instagram API not connected",
    detail: "Social performance inferred from referral traffic, not post-level data",
    severity: "medium",
    howToResolve: "Connect Instagram Business API for reach and engagement",
    blocksDecisions: ["Content performance", "Follower growth forecasts"],
  });

  unknowns.push({
    id: "offline-referrals",
    category: "attribution",
    title: "Offline referral attribution missing",
    detail: "Word-of-mouth and in-person referrals not systematically captured",
    severity: "low",
    howToResolve: "Add 'How did you hear about us?' to booking form with CRM sync",
    blocksDecisions: ["Referral rate optimization", "Channel mix"],
  });

  return unknowns;
}
