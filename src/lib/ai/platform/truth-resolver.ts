/**
 * Truth Layer — single source-of-truth metric resolver.
 *
 * Every displayed business metric should resolve through this engine so each
 * value carries provenance and an honest label (Verified / Calculated /
 * Estimated / Predicted / Unknown). Nothing is fabricated: if a source is not
 * connected, the metric says so via `missingReason` and a lower label.
 */

import { getOperatorMetrics } from "../intelligence/business-operator";
import { getAdminDashboardOSCached } from "@/lib/admin-os-server";
import { getVerificationStats } from "../memory/verification";
import { getConnectorHealth } from "./connectors";
import { buildTruthValue, type TruthValue } from "./truth-metadata";
import { getCached, setCache } from "../cache";

const CACHE_KEY = "truth-metrics-v1";
const CACHE_TTL_MS = 60_000;

export type CanonicalMetricId =
  | "revenue.today"
  | "revenue.mtd"
  | "revenue.pipeline"
  | "bookings.today"
  | "bookings.mtd"
  | "bookings.total"
  | "bookings.change"
  | "leads.mtd"
  | "leads.total"
  | "traffic.30d"
  | "traffic.7d"
  | "conversion.rate"
  | "instagram.referrals"
  | "crm.contacts"
  | "sessions.applications"
  | "clients.returning"
  | "clients.repeatRate"
  | "knowledge.verifiedPct"
  | "attention.staleInquiries"
  | "attention.followUpValue";

export interface ResolvedMetrics {
  generatedAt: string;
  metrics: Record<CanonicalMetricId, TruthValue<number>>;
  degradedSources: { id: string; label: string; blocks: string[] }[];
}

/**
 * Resolve all canonical metrics in one pass. Callers should prefer this over
 * ad-hoc calculations so provenance stays consistent platform-wide.
 */
export async function resolveMetrics(force = false): Promise<ResolvedMetrics> {
  if (!force) {
    const cached = await getCached<ResolvedMetrics>(CACHE_KEY);
    if (cached) return cached;
  }

  const resolved = await resolveMetricsUncached();
  await setCache(CACHE_KEY, resolved, CACHE_TTL_MS);
  return resolved;
}

async function resolveMetricsUncached(): Promise<ResolvedMetrics> {
  const [m, verification, connectors, dashboard] = await Promise.all([
    getOperatorMetrics(),
    getVerificationStats(),
    Promise.resolve(getConnectorHealth()),
    getAdminDashboardOSCached(),
  ]);

  const stripe = connectors.find((c) => c.id === "stripe");
  const ga4 = connectors.find((c) => c.id === "ga4");
  const instagram = connectors.find((c) => c.id === "instagram");

  const revenueVerified = Boolean(m.revenue.verified);
  const stripeConnected = stripe?.health === "healthy";
  const trafficVerified = ga4?.health === "healthy";

  const metrics: Record<CanonicalMetricId, TruthValue<number>> = {
    "revenue.today": buildTruthValue({
      value: m.revenue.today,
      label: revenueVerified ? "verified" : "estimated",
      source: revenueVerified ? "Stripe Payment table" : "Pipeline (Submission deal values)",
      table: revenueVerified ? "Payment" : "Submission",
      calculation: revenueVerified
        ? "SUM(Payment.amountCents WHERE status=succeeded AND paidAt>=today) / 100"
        : "Sum of pipeline deal values with createdAt >= today",
      evidence: revenueVerified
        ? [`${m.revenue.paymentCount} settled payment(s)`, "Stripe webhook"]
        : ["Pipeline column deal values", "Submission table"],
      dependencies: revenueVerified ? ["Stripe webhook"] : ["Stripe (for verified revenue)"],
      verificationStatus: revenueVerified ? "verified" : "pending",
      missingReason: revenueVerified
        ? undefined
        : stripeConnected
          ? "Stripe connected but no Payment rows yet — waiting for webhook events."
          : "Stripe not connected — revenue derived from pipeline deal estimates, not settled payments.",
      timestamp: m.generatedAt,
      freshness: "Live",
      displayLabel: "Revenue Today",
    }),
    "revenue.mtd": buildTruthValue({
      value: m.revenue.thisMonth,
      label: revenueVerified ? "verified" : "estimated",
      source: revenueVerified ? "Stripe Payment table" : "Pipeline (Submission deal values)",
      table: revenueVerified ? "Payment" : "Submission",
      calculation: revenueVerified
        ? "SUM(Payment.amountCents WHERE status=succeeded AND paidAt>=month start) / 100"
        : "Sum of pipeline deal values with createdAt >= month start",
      evidence: revenueVerified
        ? [`${m.revenue.paymentCount} settled payment(s)`, "Stripe webhook"]
        : ["Pipeline deal values MTD", `Change vs last month: ${m.revenue.monthChange}%`],
      dependencies: revenueVerified ? ["Stripe webhook"] : ["Stripe", "Payment table"],
      verificationStatus: revenueVerified ? "verified" : "pending",
      missingReason: revenueVerified
        ? undefined
        : stripeConnected
          ? "Stripe connected but no Payment rows yet — waiting for webhook events."
          : "Stripe/Payment not connected — MTD revenue is an estimate from pipeline deals.",
      timestamp: m.generatedAt,
      displayLabel: "Revenue (MTD)",
    }),
    "revenue.pipeline": buildTruthValue({
      value: m.revenue.pipeline,
      label: "estimated",
      source: "Pipeline",
      table: "Submission",
      calculation: "Sum of open deal values across pipeline stages",
      evidence: ["Open pipeline deal values"],
      dependencies: ["CRM stage accuracy"],
      timestamp: m.generatedAt,
      displayLabel: "Open Pipeline Value",
    }),
    "bookings.today": buildTruthValue({
      value: m.today.bookings,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(Submission WHERE type=booking AND createdAt>=today)",
      query: "SELECT COUNT(*) FROM Submission WHERE type='booking' AND createdAt >= today",
      evidence: ["First-party Submission records"],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Bookings Today",
    }),
    "bookings.mtd": buildTruthValue({
      value: m.month.bookings,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(Submission WHERE type=booking AND createdAt>=month start)",
      evidence: ["First-party Submission records"],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Bookings (MTD)",
    }),
    "bookings.total": buildTruthValue({
      value: dashboard.metrics.bookings.value,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(Submission WHERE type=booking)",
      evidence: [`${dashboard.metrics.bookings.pending} pending inquiry`],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Bookings (all time)",
    }),
    "bookings.change": buildTruthValue({
      value: m.month.bookingsChange,
      label: "calculated",
      source: "Submission table",
      table: "Submission",
      calculation: "pctChange(bookings this month, bookings last month)",
      evidence: [`This month: ${m.month.bookings}`],
      timestamp: m.generatedAt,
      displayLabel: "Bookings Change vs Last Month (%)",
    }),
    "leads.mtd": buildTruthValue({
      value: m.month.newLeads,
      label: "verified",
      source: "Dashboard OS (Submission)",
      table: "Submission",
      calculation: "New leads recorded this month",
      evidence: ["First-party lead records"],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "New Leads (MTD)",
    }),
    "leads.total": buildTruthValue({
      value: dashboard.metrics.leads.value,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(bookings + session applications + contacts)",
      evidence: [`${dashboard.metrics.leads.thisMonth} this month`],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Leads (all sources)",
    }),
    "traffic.30d": buildTruthValue({
      value: m.traffic.visitors30,
      label: trafficVerified ? "verified" : "estimated",
      source: trafficVerified ? "GA4 + first-party Analytics" : "First-party AnalyticsEvent",
      table: "AnalyticsEvent",
      api: "/api/analytics",
      calculation: "COUNT(pageviews over trailing 30 days)",
      evidence: ["First-party pageview events"],
      dependencies: trafficVerified ? [] : ["GA4 (for cross-device + bot filtering)"],
      verificationStatus: "verified",
      missingReason: trafficVerified
        ? undefined
        : "GA4 not connected — first-party pageviews only (no bot filtering / cross-device).",
      timestamp: m.generatedAt,
      displayLabel: "Traffic (30d pageviews)",
    }),
    "traffic.7d": buildTruthValue({
      value: m.traffic.visitors7,
      label: "verified",
      source: "First-party AnalyticsEvent",
      table: "AnalyticsEvent",
      calculation: "COUNT(pageviews over trailing 7 days)",
      evidence: ["First-party pageview events"],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Traffic (7d pageviews)",
    }),
    "conversion.rate": buildTruthValue({
      value: m.traffic.conversionRate,
      label: "calculated",
      source: "First-party AnalyticsEvent",
      table: "AnalyticsEvent",
      calculation: "conversions / inquiry-intent pageviews (30d)",
      evidence: ["First-party conversion + pageview events"],
      dependencies: ["Complete conversion tracking on all forms"],
      timestamp: m.generatedAt,
      displayLabel: "Conversion Rate (%)",
    }),
    "instagram.referrals": buildTruthValue({
      value: m.traffic.instagramReferrals,
      label: instagram?.health === "healthy" ? "verified" : "estimated",
      source: instagram?.health === "healthy" ? "Instagram Graph API" : "Referrer inference (AnalyticsEvent)",
      table: "AnalyticsEvent",
      calculation: "Visits where referrer/UTM source matches instagram (30d)",
      evidence: ["UTM + referrer strings"],
      dependencies: ["Instagram Graph API (for reach/saves/profile visits)"],
      verificationStatus: instagram?.health === "healthy" ? "verified" : "pending",
      missingReason:
        instagram?.health === "healthy"
          ? undefined
          : "Instagram API not connected — referral count inferred from referrer strings only.",
      timestamp: m.generatedAt,
      displayLabel: "Instagram Referrals (30d)",
    }),
    "clients.repeatRate": buildTruthValue({
      value: m.repeatRate,
      label: "calculated",
      source: "CRM contacts",
      table: "Submission + CRM",
      calculation: "returning clients / total clients",
      evidence: [`Returning clients: ${m.returningClients}`],
      timestamp: m.generatedAt,
      displayLabel: "Repeat Client Rate (%)",
    }),
    "clients.returning": buildTruthValue({
      value: m.returningClients,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(contactEmail with >1 completed booking)",
      evidence: [`Repeat rate: ${m.repeatRate}%`],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Returning Clients",
    }),
    "crm.contacts": buildTruthValue({
      value: dashboard.metrics.subscribers.value,
      label: "verified",
      source: "Submission unique emails",
      table: "Submission",
      calculation: "COUNT(DISTINCT contactEmail from bookings)",
      evidence: [dashboard.metrics.subscribers.label],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Contacts",
    }),
    "sessions.applications": buildTruthValue({
      value: dashboard.metrics.applications.value,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(Submission WHERE type=session)",
      evidence: [`${dashboard.metrics.applications.pending} pending review`],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Session Applications",
    }),
    "knowledge.verifiedPct": buildTruthValue({
      value: verification.verifiedPct,
      label: "verified",
      source: "AIMemory verification status",
      table: "AIMemory",
      api: "/api/admin/ai/memory/verify",
      calculation: "(verified + trusted) / total active memories",
      evidence: [
        `Verified: ${verification.verified}`,
        `Trusted: ${verification.trusted}`,
        `Pending: ${verification.pending}`,
      ],
      verificationStatus: "verified",
      timestamp: new Date().toISOString(),
      displayLabel: "Knowledge Verified (%)",
    }),
    "attention.staleInquiries": buildTruthValue({
      value: m.attention.abandonedInquiries,
      label: "verified",
      source: "Submission table",
      table: "Submission",
      calculation: "COUNT(booking WHERE open stage AND updatedAt < 3 days ago)",
      evidence: ["First-party Submission records"],
      verificationStatus: "verified",
      timestamp: m.generatedAt,
      displayLabel: "Stale Inquiries",
    }),
    "attention.followUpValue": buildTruthValue({
      value: m.attention.followUpValue,
      label: "estimated",
      source: "CRM inactive leads",
      table: "Submission + CRM",
      calculation: "Sum of max(revenue, $1,200) for leads inactive 60+ days",
      evidence: [`${m.attention.followUpClients} inactive leads`],
      dependencies: ["Accurate CRM revenue history"],
      timestamp: m.generatedAt,
      displayLabel: "Follow-up Opportunity Value",
    }),
  };

  const degradedSources = connectors
    .filter((c) => c.health !== "healthy" && c.blocksDecisions.length > 0)
    .map((c) => ({ id: c.id, label: c.label, blocks: c.blocksDecisions }));

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    degradedSources,
  };
}

/** Resolve a single canonical metric. */
export async function resolveMetric(id: CanonicalMetricId): Promise<TruthValue<number>> {
  const all = await resolveMetrics();
  return all.metrics[id];
}
