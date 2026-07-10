/**
 * Unknowns Center — only genuine integration / data gaps.
 * Never invent missing data that is already available from connectors or DB.
 */

import { getOperatorMetrics } from "../intelligence/business-operator";
import { getEmbeddingStats } from "../memory/embeddings";
import { searchMemories } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { getConnectorHealth, type ConnectorHealth } from "../platform/connectors";
import { prisma } from "@/lib/db";
import type { UnknownItem } from "./types";

function fromConnector(
  c: ConnectorHealth,
  extras: {
    whyItMatters: string;
    businessImpact: string;
    estimatedImprovement: string;
    severity: UnknownItem["severity"];
    connectHref?: string;
  }
): UnknownItem {
  return {
    id: `connector-${c.id}`,
    category: c.id,
    title: c.label,
    status: c.connected ? (c.health === "healthy" ? "Connected" : "Degraded") : "Not connected",
    detail: c.unknownFields.length
      ? `Missing fields: ${c.unknownFields.slice(0, 4).join(", ")}`
      : c.missingPermissions[0] ?? "Integration unavailable",
    whyItMatters: extras.whyItMatters,
    businessImpact: extras.businessImpact,
    estimatedImprovement: extras.estimatedImprovement,
    severity: extras.severity,
    howToResolve: c.missingPermissions[0]
      ? `Configure ${c.missingPermissions[0]}`
      : `Restore ${c.label} connectivity`,
    connectAction: `Connect ${c.label}`,
    connectHref: extras.connectHref ?? "/admin/qa",
    blocksDecisions: c.blocksDecisions,
  };
}

/** Only report real gaps — connectors that are disconnected/degraded, or measured data holes. */
export async function buildUnknowns(): Promise<UnknownItem[]> {
  const workspaceId = getWorkspaceId();
  const connectors = getConnectorHealth();

  const [metrics, embeddings, lowConf, memoryTotal, expenseMemories] = await Promise.all([
    getOperatorMetrics(),
    getEmbeddingStats(),
    searchMemories({ workspaceId, limit: 200 }).then((r) =>
      r.items.filter((m) => m.confidence < 0.5 && !m.archived)
    ),
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
    prisma.aIMemory
      .count({
        where: {
          workspaceId,
          archived: false,
          OR: [
            { category: { contains: "expense" } },
            { key: { contains: "expense" } },
            { tags: { contains: "expense" } },
          ],
        },
      })
      .catch(() => 0),
  ]);

  const unknowns: UnknownItem[] = [];

  const connectorMeta: Record<
    string,
    {
      whyItMatters: string;
      businessImpact: string;
      estimatedImprovement: string;
      severity: UnknownItem["severity"];
    }
  > = {
    ga4: {
      whyItMatters: "Channel and audience truth requires GA4 — first-party pageviews alone cannot attribute ROI.",
      businessImpact: "Campaign and landing-page decisions stay Estimated.",
      estimatedImprovement: "+20–30% attribution confidence",
      severity: "high",
    },
    search_console: {
      whyItMatters: "Organic strategy needs query/impression data, not on-page guesses.",
      businessImpact: "SEO opportunities lack verified search demand.",
      estimatedImprovement: "+25% SEO forecast accuracy",
      severity: "medium",
    },
    instagram: {
      whyItMatters: "Creative businesses live on social proof — post-level reach is otherwise invisible.",
      businessImpact: "Content ROI and growth forecasts stay inferred.",
      estimatedImprovement: "+15% content recommendation confidence",
      severity: "medium",
    },
    meta_ads: {
      whyItMatters: "Paid CAC and ROAS cannot be calculated without ad spend.",
      businessImpact: "Budget allocation decisions are blocked or Estimated.",
      estimatedImprovement: "+35% paid-channel decision confidence",
      severity: "high",
    },
    stripe: {
      whyItMatters: "Verified revenue and cash position require settled payments.",
      businessImpact: "Profit and cash forecasts use pipeline estimates only.",
      estimatedImprovement: "+40% finance truth score",
      severity: "high",
    },
    clarity: {
      whyItMatters: "UX friction (rage clicks, abandon) needs session intelligence.",
      businessImpact: "Form and funnel fixes stay speculative.",
      estimatedImprovement: "+10% conversion diagnosis confidence",
      severity: "low",
    },
    google_business: {
      whyItMatters: "Local discovery and reviews feed brand trust signals.",
      businessImpact: "Local SEO and reputation risks stay Unknown.",
      estimatedImprovement: "+12% local demand visibility",
      severity: "low",
    },
  };

  for (const c of connectors) {
    // Skip always-internal healthy sources — they are not unknowns
    if (["analytics", "crm", "booking_platform", "neon", "vercel"].includes(c.id)) continue;
    if (c.health === "healthy" && c.connected) continue;

    const meta = connectorMeta[c.id];
    if (!meta && c.blocksDecisions.length === 0) continue;

    unknowns.push(
      fromConnector(c, {
        whyItMatters: meta?.whyItMatters ?? `${c.label} feeds decisions that are currently blocked or estimated.`,
        businessImpact:
          meta?.businessImpact ??
          (c.blocksDecisions[0] ? `Blocks: ${c.blocksDecisions.slice(0, 2).join(", ")}` : "Incomplete intelligence"),
        estimatedImprovement: meta?.estimatedImprovement ?? "+10–20% related forecast confidence",
        severity: meta?.severity ?? (c.blocksDecisions.length > 0 ? "medium" : "low"),
      })
    );
  }

  // Expense ledger — genuine gap when no expense memory / payment-only finance
  if (expenseMemories === 0) {
    unknowns.push({
      id: "expenses",
      category: "finance",
      title: "Expense ledger",
      status: "Not connected",
      detail: "No expense records in memory or accounting connector.",
      whyItMatters: "Profit = revenue − cost. Without expenses, margin advice is incomplete.",
      businessImpact: "Profit forecasts use revenue estimates only.",
      estimatedImprovement: "+27% forecast accuracy",
      severity: "medium",
      howToResolve: "Import expenses or connect accounting software",
      connectAction: "Connect accounting",
      connectHref: "/admin/qa",
      blocksDecisions: ["Profit forecasts", "Pricing margin analysis"],
    });
  }

  // Referral attribution — only when a material share of bookings lack referralSource in payload
  const recentBookings = await prisma.submission
    .findMany({
      where: { type: "booking", createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
      select: { data: true },
      take: 100,
    })
    .catch(() => [] as { data: string }[]);

  let missingReferral = 0;
  for (const b of recentBookings) {
    try {
      const d = JSON.parse(b.data) as { referralSource?: string };
      if (!d.referralSource || d.referralSource === "Direct" || d.referralSource === "unknown") {
        missingReferral += 1;
      }
    } catch {
      missingReferral += 1;
    }
  }
  if (recentBookings.length >= 8 && missingReferral / recentBookings.length >= 0.4) {
    unknowns.push({
      id: "referral-attribution",
      category: "attribution",
      title: "Referral attribution incomplete",
      status: `${missingReferral}/${recentBookings.length} bookings without clear source`,
      detail: "No CRM source for how clients found the studio on a material share of bookings.",
      whyItMatters: "Channel mix and referral programs need attribution to allocate effort.",
      businessImpact: "Referral rate and partner ROI stay Unknown.",
      estimatedImprovement: "+18% channel-mix confidence",
      severity: "low",
      howToResolve: "Require 'How did you hear about us?' on booking + CRM sync",
      connectAction: "Review booking form",
      connectHref: "/admin/forms",
      blocksDecisions: ["Referral optimization", "Channel mix"],
    });
  }

  // Conversion tracking — only when traffic exists but conversion is zero (measured anomaly)
  if (metrics.traffic.conversionRate === 0 && metrics.traffic.visitors30 > 50) {
    unknowns.push({
      id: "conversion-tracking",
      category: "analytics",
      title: "Conversion events may be under-tracked",
      status: "Anomaly detected",
      detail: `${metrics.traffic.visitors30} visitors / 30d with 0% conversion — verify booking funnel events.`,
      whyItMatters: "Funnel optimization requires trustworthy conversion measurement.",
      businessImpact: "Page conversion scores and A/B decisions are unreliable.",
      estimatedImprovement: "+22% funnel diagnosis confidence",
      severity: "high",
      howToResolve: "Audit analytics events on /book funnel",
      connectAction: "Open analytics",
      connectHref: "/admin/analytics",
      blocksDecisions: ["Funnel optimization", "Page conversion scores"],
    });
  }

  // Semantic index — only when materially incomplete vs memory count
  if (memoryTotal > 20 && embeddings.chunks < memoryTotal * 0.3) {
    unknowns.push({
      id: "embeddings",
      category: "memory",
      title: "Semantic index incomplete",
      status: `${embeddings.chunks} / ${memoryTotal} indexed`,
      detail: "Retrieval gaps likely — Business Brain cannot fully search institutional memory.",
      whyItMatters: "Recommendations and Ask ÉLEVÉ rely on semantic recall.",
      businessImpact: "Cross-memory patterns and evidence retrieval degrade.",
      estimatedImprovement: "+15% recall coverage",
      severity: "medium",
      howToResolve: "Run Refresh intelligence from Business Brain",
      connectAction: "Open Business Brain",
      connectHref: "/admin/memory",
      blocksDecisions: ["Semantic recall", "Evidence retrieval"],
    });
  }

  if (lowConf.length > 8) {
    unknowns.push({
      id: "low-confidence-memory",
      category: "memory",
      title: `${lowConf.length} low-confidence memories`,
      status: "Needs verification",
      detail: "These memories can influence recommendations without verification.",
      whyItMatters: "Unverified knowledge quietly lowers recommendation trust.",
      businessImpact: "Composite confidence stays capped until verified.",
      estimatedImprovement: `+${Math.min(25, Math.round(lowConf.length / 2))}% knowledge trust`,
      severity: "medium",
      howToResolve: "Verify or archive low-confidence entries in Business Brain",
      connectAction: "Verify knowledge",
      connectHref: "/admin/memory",
      blocksDecisions: ["Recommendation confidence"],
    });
  }

  return unknowns.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}
