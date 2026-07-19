/**
 * One metric = one owner. Pages may reference metrics but must never
 * recalculate owned values with a second formula.
 */

import { prisma } from "@/lib/db";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getOperatorMetrics } from "../intelligence/business-operator";
import { buildTruthValue, type TruthValue } from "./truth-metadata";

export type MetricOwnerId =
  | "financial_center"
  | "bookings"
  | "analytics"
  | "pipeline"
  | "ai_operations"
  | "clients"
  | "applications";

export interface MetricOwner {
  id: MetricOwnerId;
  label: string;
  href: string;
}

export const METRIC_OWNERS: Record<MetricOwnerId, MetricOwner> = {
  financial_center: {
    id: "financial_center",
    label: "Financial Center",
    // Phase 6 destination; temporary owner is Payments until Financial Center ships.
    href: "/admin/payments",
  },
  bookings: {
    id: "bookings",
    label: "Bookings",
    href: "/admin/submissions?type=booking",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    href: "/admin/pipeline",
  },
  ai_operations: {
    id: "ai_operations",
    label: "AI Operations",
    href: "/admin/ai-health",
  },
  clients: {
    id: "clients",
    label: "Clients",
    href: "/admin/crm",
  },
  applications: {
    id: "applications",
    label: "Applications",
    href: "/admin/applications",
  },
};

export interface MissingMetric {
  label: string;
  reason: string;
  required: string[];
  confidence: 0;
  unlockAfter: string;
  owner: MetricOwner;
  unlockHref?: string;
}

export interface OwnedMetric {
  key: string;
  label: string;
  owner: MetricOwner;
  /** Present when the owner can produce a value. */
  metric: TruthValue<number> | null;
  missing: MissingMetric | null;
}

function unknownMetric(
  key: string,
  label: string,
  owner: MetricOwner,
  reason: string,
  required: string[],
  unlockAfter: string
): OwnedMetric {
  return {
    key,
    label,
    owner,
    metric: null,
    missing: {
      label,
      reason,
      required,
      confidence: 0,
      unlockAfter,
      owner,
      unlockHref: "/admin/qa",
    },
  };
}

function knownMetric(
  key: string,
  label: string,
  owner: MetricOwner,
  value: number,
  truth: Omit<Parameters<typeof buildTruthValue<number>>[0], "value" | "displayLabel">
): OwnedMetric {
  return {
    key,
    label,
    owner,
    metric: buildTruthValue({
      ...truth,
      value,
      displayLabel: label,
    }),
    missing: null,
  };
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Canonical KPI pack for Command Home — references only, no duplicate formulas. */
export async function resolveCommandKpis(): Promise<OwnedMetric[]> {
  const todayStart = startOfDay();
  const monthStart = startOfMonth();
  const [metrics, analytics, paymentsToday, paymentsMtd, bookingsToday, leadsToday] =
    await Promise.all([
      getOperatorMetrics(),
      getAnalyticsSummary(30),
      prisma.payment.aggregate({
        where: { status: "succeeded", createdAt: { gte: todayStart } },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: "succeeded", createdAt: { gte: monthStart } },
        _sum: { amountCents: true },
      }),
      prisma.submission.count({
        where: { type: "booking", createdAt: { gte: todayStart } },
      }),
      prisma.submission.count({
        where: {
          type: { in: ["booking", "contact"] },
          createdAt: { gte: todayStart },
        },
      }),
    ]);

  const revenueTodayCents = paymentsToday._sum.amountCents ?? 0;
  const revenueMtdCents = paymentsMtd._sum.amountCents ?? 0;
  const visitors = analytics.totals.uniqueSessions;
  const pipeline = metrics.revenue.pipeline;

  return [
    revenueTodayCents > 0
      ? knownMetric(
          "revenue_today",
          "Revenue Today",
          METRIC_OWNERS.financial_center,
          revenueTodayCents / 100,
          {
            label: "verified",
            source: "Payment",
            table: "Payment",
            calculation: "SUM(amountCents) WHERE status=succeeded AND createdAt>=today",
            evidence: [`${revenueTodayCents / 100} settled today`],
            confidence: 1,
            freshness: "realtime",
            verificationStatus: "verified",
            dependencies: ["Stripe / Payment records"],
            owner: METRIC_OWNERS.financial_center.label,
          }
        )
      : unknownMetric(
          "revenue_today",
          "Revenue Today",
          METRIC_OWNERS.financial_center,
          "No settled payments recorded today.",
          ["Payment created", "status = succeeded", "createdAt today"],
          "Unlock after the first successful payment settles today."
        ),
    revenueMtdCents > 0
      ? knownMetric(
          "revenue_mtd",
          "Revenue MTD",
          METRIC_OWNERS.financial_center,
          revenueMtdCents / 100,
          {
            label: "verified",
            source: "Payment",
            table: "Payment",
            calculation: "SUM(amountCents) WHERE status=succeeded AND createdAt>=monthStart",
            evidence: [`${revenueMtdCents / 100} settled this month`],
            confidence: 1,
            freshness: "realtime",
            verificationStatus: "verified",
            dependencies: ["Stripe / Payment records"],
            owner: METRIC_OWNERS.financial_center.label,
          }
        )
      : unknownMetric(
          "revenue_mtd",
          "Revenue MTD",
          METRIC_OWNERS.financial_center,
          "No settled payments recorded this month.",
          ["Payment created", "status = succeeded", "createdAt this month"],
          "Unlock after the first successful payment settles this month."
        ),
    knownMetric("bookings", "Bookings", METRIC_OWNERS.bookings, bookingsToday, {
      label: "verified",
      source: "Submission",
      table: "Submission",
      calculation: "COUNT(*) WHERE type=booking AND createdAt>=today",
      evidence: [`${bookingsToday} booking submissions today`],
      confidence: 1,
      freshness: "realtime",
      verificationStatus: "verified",
      dependencies: ["Booking form"],
      owner: METRIC_OWNERS.bookings.label,
    }),
    knownMetric("new_leads", "New Leads", METRIC_OWNERS.bookings, leadsToday, {
      label: "verified",
      source: "Submission",
      table: "Submission",
      calculation: "COUNT(*) WHERE type IN (booking,contact) AND createdAt>=today",
      evidence: [`${leadsToday} lead submissions today`],
      confidence: 1,
      freshness: "realtime",
      verificationStatus: "verified",
      dependencies: ["Booking + contact forms"],
      owner: METRIC_OWNERS.bookings.label,
    }),
    visitors > 0
      ? knownMetric("website_visitors", "Website Visitors", METRIC_OWNERS.analytics, visitors, {
          label: "calculated",
          source: "AnalyticsEvent",
          table: "AnalyticsEvent",
          calculation: "uniqueSessions over last 30 days",
          evidence: [`${visitors} unique sessions (30d)`],
          confidence: 0.9,
          freshness: "hourly",
          verificationStatus: "verified",
          dependencies: ["Site analytics collector"],
          owner: METRIC_OWNERS.analytics.label,
        })
      : unknownMetric(
          "website_visitors",
          "Website Visitors",
          METRIC_OWNERS.analytics,
          "No analytics sessions recorded in the last 30 days.",
          ["Analytics collector enabled", "Page views recorded"],
          "Unlock after analytics events begin flowing."
        ),
    pipeline > 0
      ? knownMetric("pipeline_value", "Pipeline Value", METRIC_OWNERS.pipeline, pipeline, {
          label: "estimated",
          source: "Booking inquiry budgets",
          table: "Submission",
          calculation: "Sum of open booking budget estimates (not settled cash)",
          evidence: [`Open pipeline ≈ $${pipeline.toLocaleString()} (Estimated)`],
          confidence: 0.55,
          freshness: "hourly",
          verificationStatus: "pending",
          dependencies: ["Booking budgets", "Inquiry stages"],
          owner: METRIC_OWNERS.pipeline.label,
          missingReason: "Budget fields are self-reported; not ledger-verified.",
        })
      : unknownMetric(
          "pipeline_value",
          "Pipeline Value",
          METRIC_OWNERS.pipeline,
          "No open booking inquiries with budget estimates.",
          ["Booking inquiry created", "Budget range recorded", "Stage not archived"],
          "Unlock after open inquiries include budget data."
        ),
    unknownMetric(
      "cash_available",
      "Cash Available",
      METRIC_OWNERS.financial_center,
      "Cash balance is not connected. Payments records settle cash-in only; bank balances are not imported.",
      ["Bank / Stripe balance connector", "Payout reconciliation", "Expense ledger"],
      "Unlock after Financial Center connects a balance source (Phase 6)."
    ),
  ];
}
