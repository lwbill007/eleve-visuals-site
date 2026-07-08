/**
 * Missing Business Intelligence — connector gaps as business statements,
 * not an integration checklist.
 */

import { getConnectorHealth, type ConnectorHealth } from "./connectors";
import { getPaymentRevenueSummary } from "@/lib/payments";

export interface MissingIntelItem {
  id: string;
  title: string;
  missing: string;
  whyItMatters: string;
  confidenceLost: string;
  businessImpact: string;
  revenueImpact: string;
  howToFix: string;
  estimatedImprovement: string;
  severity: "critical" | "high" | "medium" | "low";
  href: string;
}

function fromConnector(c: ConnectorHealth): MissingIntelItem | null {
  if (c.health === "healthy") return null;

  const blocked = c.blocksDecisions.slice(0, 3).join("; ") || "Related decisions stay estimated";
  const perms = c.missingPermissions.join(", ") || "credentials";

  const severity: MissingIntelItem["severity"] =
    c.id === "stripe" || c.id === "resend"
      ? "critical"
      : c.blocksDecisions.length > 0
        ? "high"
        : "medium";

  return {
    id: `missing-${c.id}`,
    title: `${c.label} intelligence missing`,
    missing: c.unknownFields.slice(0, 4).join(", ") || c.label,
    whyItMatters: blocked,
    confidenceLost:
      c.health === "disconnected"
        ? "High — source offline; claims depending on it cannot be Verified"
        : "Medium — env present but no live sync",
    businessImpact: blocked,
    revenueImpact:
      c.id === "stripe"
        ? "Revenue stays Estimated from pipeline deals"
        : c.id === "meta_ads"
          ? "Cannot compute CAC / ROAS — paid spend advice blocked"
          : "Indirect — decisions that need this source stay low-confidence",
    howToFix: `Set ${perms} in Vercel env${c.id === "stripe" ? " and point webhook to /api/webhooks/stripe" : ""}`,
    estimatedImprovement:
      c.id === "stripe"
        ? "Unlocks Verified revenue on Command Center"
        : c.id === "resend"
          ? "Enables measurable email nurture ROI"
          : "Raises Trust score and recommendation confidence",
    severity,
    href: "/admin/settings",
  };
}

export async function getMissingBusinessIntelligence(): Promise<{
  items: MissingIntelItem[];
  payments: { hasPayments: boolean; count: number };
}> {
  const connectors = getConnectorHealth();
  const payments = await getPaymentRevenueSummary().catch(() => ({
    hasPayments: false,
    count: 0,
    todayCents: 0,
    thisMonthCents: 0,
    lastMonthCents: 0,
    totalCents: 0,
  }));

  const items: MissingIntelItem[] = [];

  for (const c of connectors) {
    const item = fromConnector(c);
    if (item) items.push(item);
  }

  if (!payments.hasPayments) {
    const stripe = connectors.find((c) => c.id === "stripe");
    if (stripe?.health === "healthy") {
      items.unshift({
        id: "missing-payment-rows",
        title: "No settled Payment rows yet",
        missing: "Succeeded Stripe charges in Payment table",
        whyItMatters: "Stripe is configured but Truth Layer still has nothing to verify",
        confidenceLost: "Revenue remains Estimated until first webhook event lands",
        businessImpact: "Command Center cannot show Verified cash",
        revenueImpact: "All MTD revenue labeled Estimated",
        howToFix: "Send a test payment or replay Stripe events to /api/webhooks/stripe",
        estimatedImprovement: "First Payment row flips revenue.mtd to Verified",
        severity: "high",
        href: "/admin/qa",
      });
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return { items, payments: { hasPayments: payments.hasPayments, count: payments.count } };
}
