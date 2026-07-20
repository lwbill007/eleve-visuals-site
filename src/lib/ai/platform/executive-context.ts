/**
 * Executive Context — the single shared state every admin page consumes.
 *
 * Unifies Truth Layer + connector health + verification + the top guarded
 * recommendation so every module answers: "What should I do next?"
 */

import { resolveMetrics, type ResolvedMetrics } from "./truth-resolver";
import { getConnectorHealth } from "./connectors";
import { getVerificationStats } from "../memory/verification";
import { getGuardedRecommendations } from "../truth/recommendation-guardrails";
import { getCached, setCache, invalidateCache } from "../cache";
import { buildConfidencePanel } from "./confidence-panel";
import { detectRevenueLeaks, totalLeakExposure } from "../executive/revenue-leaks";
import { getPaymentRevenueSummary } from "@/lib/payments";
import { buildCostOfIgnore, type CostOfIgnore } from "./cost-of-ignore";
import { getLearningOutcomes } from "../memory/learning";

/** Bump whenever nextAction honesty rules change — AICache survives deploys. */
const CACHE_KEY = "executive-context-v10-no-fake-inq";
const CACHE_TTL_MS = 60_000;

export type HealthLabel = "strong" | "steady" | "watch" | "critical" | "unknown";

export interface HealthDimension {
  score: number;
  label: HealthLabel;
  /** Human summary — honest about estimation vs verification. */
  note: string;
}

/** Compact next-action card shared across every admin page. */
export interface NextAction {
  id: string;
  title: string;
  why: string;
  evidence: string[];
  estimatedRevenue: number;
  confidence: number;
  timeMinutes: number;
  priority: string;
  href: string;
  actionLabel: string;
  category: string;
  /** Adapter kind for one-click execute (inferred when omitted). */
  executeKind?: string;
  /** What happens if the user does nothing. */
  costOfIgnore: CostOfIgnore;
  /** Expected outcome if acted on. */
  expectedOutcome: string;
  /** Reasoning chain (why now). */
  reasoning: string;
  /** Prediction statement. */
  prediction: string;
  decisionStatus?: "pending" | "accepted" | "completed" | "rejected";
  learningStatus?: "waiting" | "learned" | "none";
  actualOutcome?: string;
  actualRevenue?: number;
}

/** Risk signal derived from truth/connectors/verification — no fabricated alerts. */
export interface RiskSignal {
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  href: string;
  actionLabel: string;
  /** Potential $ impact if unresolved. */
  potentialImpact: number;
  confidence: number;
  costOfIgnore: CostOfIgnore;
  expectedOutcome: string;
  reasoning: string;
  prediction: string;
  likelihood?: number;
  owner?: string;
  deadline?: string | null;
  recoveryPlan?: string;
  verification?: string;
  domain?: string;
}

export interface ExecutiveContext {
  generatedAt: string;
  truth: ResolvedMetrics;
  connectors: {
    total: number;
    healthy: number;
    degraded: number;
    disconnected: number;
    degradedLabels: string[];
    blockedDecisions: string[];
  };
  verification: {
    total: number;
    verifiedPct: number;
    targetPct: number;
    pending: number;
    verified: number;
    trusted: number;
  };
  /**
   * Category business health. Each score documents its note (formula evidence).
   * Overall is a weighted blend — never an opaque vanity number alone.
   */
  health: {
    overall: HealthDimension;
    revenue: HealthDimension;
    sales: HealthDimension;
    growth: HealthDimension;
    data: HealthDimension;
    finance: HealthDimension;
    marketing: HealthDimension;
    website: HealthDimension;
    operations: HealthDimension;
    brand: HealthDimension;
  };
  /** Multi-factor confidence panel for the current posture. */
  confidence: {
    band: "high" | "medium" | "low" | "blocked";
    composite: number;
    factors: { id: string; label: string; score: number; weight: number; note: string }[];
    blockers: string[];
  };
  /** Revenue leak exposure from detector (estimated recovery). */
  leaks: {
    loss: number;
    recoverable: number;
    count: number;
  };
  /**
   * Non-fatal subsystem failures while building context.
   * UI should show uncertainty — never pretend empty means healthy.
   */
  partialErrors?: { source: string; message: string }[];
  /** One-line executive headline summarizing current posture. */
  headline: string;
  /** The single highest-impact next action (guarded recommendations). */
  nextAction: NextAction | null;
  /** Ranked recommendation queue for Opportunity Center + Home. */
  recommendations: NextAction[];
  /** Derived risk signals for Risk Center + Home. */
  risks: RiskSignal[];
  /** Overall data-trust score 0-100. */
  trustScore: number;
}

function labelFor(score: number): HealthLabel {
  if (score >= 75) return "strong";
  if (score >= 55) return "steady";
  if (score >= 35) return "watch";
  return "critical";
}

function computeTrustScore(
  verifiedPct: number,
  connectorHealthyRatio: number,
  degradedMetricRatio: number
): number {
  const verificationWeight = 0.5;
  const connectorWeight = 0.3;
  const truthWeight = 0.2;
  const score =
    verifiedPct * verificationWeight +
    connectorHealthyRatio * 100 * connectorWeight +
    (1 - degradedMetricRatio) * 100 * truthWeight;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function toNextAction(
  r: Awaited<ReturnType<typeof getGuardedRecommendations>>[number],
  learningByRef: Map<string, { outcome: string; revenueImpact?: number | null; status: "waiting" | "learned" }>
): NextAction {
  const href = r.actions[0]?.href ?? "/admin/opportunities";
  const id = r.id.toLowerCase();
  let executeKind = "navigate";
  // Only batch-mark when the recommendation is explicitly about stale inquiries —
  // booking inbox links must navigate, not mutate every aging lead.
  if (id.includes("stale")) {
    executeKind = "mark_stale_bookings_contacted";
  } else if (href.includes("/admin/pipeline")) {
    executeKind = "open_pipeline";
  } else if (href.includes("/admin/applications")) {
    executeKind = "open_applications";
  } else if (href.includes("/admin/memory")) {
    executeKind = "open_memory_verify";
  } else if (href.includes("/admin/qa") || href.includes("/admin/financial")) {
    executeKind = "open_payments_trust";
  }

  const actionLabel =
    executeKind === "mark_stale_bookings_contacted"
      ? "Advance to Consultation"
      : executeKind === "open_memory_verify"
        ? "Verify"
        : executeKind === "open_payments_trust"
          ? "Fix sources"
          : (r.actions[0]?.label ?? "Execute");

  const costOfIgnore = buildCostOfIgnore({
    estimatedRevenue: r.estimatedRevenue,
    confidence: r.confidence,
    category: r.category,
    priority: r.priority,
    evidence: r.evidence,
    why: r.whyNow || r.detail,
    kind: "opportunity",
  });

  const er = r.executiveRecommendation;
  const learn = learningByRef.get(r.id) ?? learningByRef.get(r.title);
  const expectedOutcome =
    er?.confidenceDetail?.expectedOutcome ||
    (r.estimatedRevenue > 0
      ? `Capture ~$${r.estimatedRevenue.toLocaleString()} opportunity`
      : er?.successMetric || "Advance the recommended action");

  // Close the learning loop: adjust displayed confidence from historical outcomes
  let adjustedConfidence = r.confidence;
  if (learn?.status === "learned") {
    adjustedConfidence =
      learn.outcome === "positive"
        ? Math.min(0.95, r.confidence + 0.04)
        : learn.outcome === "negative"
          ? Math.max(0.35, r.confidence - 0.08)
          : r.confidence;
  }

  return {
    id: r.id,
    title: r.title,
    why: r.whyNow || r.detail,
    evidence: (r.evidence ?? []).slice(0, 6),
    estimatedRevenue: r.estimatedRevenue,
    confidence: Math.round(adjustedConfidence * 100) / 100,
    timeMinutes: r.timeToCompleteMinutes,
    priority: r.priority,
    href,
    actionLabel,
    category: r.category,
    executeKind,
    costOfIgnore,
    expectedOutcome,
    reasoning: er?.reasoning || r.whyNow || r.detail,
    prediction:
      r.estimatedRevenue > 0
        ? `+$${r.estimatedRevenue.toLocaleString()} if executed within the decay window`
        : expectedOutcome,
    decisionStatus: learn?.status === "learned" ? "completed" : learn?.status === "waiting" ? "accepted" : "pending",
    learningStatus: learn?.status ?? "none",
    actualOutcome: learn?.status === "learned" ? learn.outcome : undefined,
    actualRevenue: learn?.revenueImpact ?? undefined,
  };
}

export async function getExecutiveContext(force = false): Promise<ExecutiveContext> {
  if (force) {
    await invalidateCache("executive-context");
  } else {
    const cached = await getCached<ExecutiveContext>(CACHE_KEY);
    if (cached) return cached;
  }

  const partialErrors: { source: string; message: string }[] = [];

  const [truth, connectorList, verification, guarded, leakList, payments, learningOutcomes] =
    await Promise.all([
    resolveMetrics(force),
    Promise.resolve(getConnectorHealth()),
    getVerificationStats(),
    getGuardedRecommendations(8).catch((e: unknown) => {
      partialErrors.push({
        source: "recommendations",
        message: e instanceof Error ? e.message : "Recommendations unavailable",
      });
      return [] as Awaited<ReturnType<typeof getGuardedRecommendations>>;
    }),
    detectRevenueLeaks().catch((e: unknown) => {
      partialErrors.push({
        source: "leaks",
        message: e instanceof Error ? e.message : "Leak detector unavailable",
      });
      return [];
    }),
    getPaymentRevenueSummary().catch((e: unknown) => {
      partialErrors.push({
        source: "payments",
        message: e instanceof Error ? e.message : "Payment summary unavailable",
      });
      return {
        hasPayments: false,
        count: 0,
        todayCents: 0,
        thisMonthCents: 0,
        lastMonthCents: 0,
        totalCents: 0,
      };
    }),
    getLearningOutcomes("executive", 40).catch(() => []),
  ]);

  const learningByRef = new Map<
    string,
    { outcome: string; revenueImpact?: number | null; status: "waiting" | "learned" }
  >();
  for (const o of learningOutcomes) {
    const status: "waiting" | "learned" =
      o.outcome === "neutral" ? "waiting" : "learned";
    const entry = {
      outcome: o.outcome,
      revenueImpact: o.revenueImpact,
      status,
    };
    if (o.actionType) learningByRef.set(o.actionType, entry);
    if (o.actionRef) learningByRef.set(o.actionRef, entry);
  }

  const healthy = connectorList.filter((c) => c.health === "healthy").length;
  const degraded = connectorList.filter((c) => c.health === "degraded").length;
  const disconnected = connectorList.filter(
    (c) => c.health === "disconnected" || c.health === "error"
  ).length;
  const degradedLabels = connectorList
    .filter((c) => c.health !== "healthy" && c.blocksDecisions.length > 0)
    .map((c) => c.label);
  const blockedDecisions = Array.from(
    new Set(connectorList.flatMap((c) => (c.health !== "healthy" ? c.blocksDecisions : [])))
  );

  const metricValues = Object.values(truth.metrics);
  const degradedMetrics = metricValues.filter(
    (m) => m.label === "estimated" || m.label === "unknown"
  ).length;
  const degradedMetricRatio = metricValues.length > 0 ? degradedMetrics / metricValues.length : 0;

  const trustScore = computeTrustScore(
    verification.verifiedPct,
    connectorList.length > 0 ? healthy / connectorList.length : 0,
    degradedMetricRatio
  );

  const m = truth.metrics;
  const num = (v: number | string | undefined) => (typeof v === "number" ? v : 0);

  const staleInquiries = num(m["attention.staleInquiries"]?.value);
  const bookingsMtd = num(m["bookings.mtd"]?.value);
  const revenueMtd = num(m["revenue.mtd"]?.value);
  const pipeline = num(m["revenue.pipeline"]?.value);
  const revenueVerified = m["revenue.mtd"]?.label === "verified";
  const conversion = num(m["conversion.rate"]?.value);
  const traffic30 = num(m["traffic.30d"]?.value);

  const revenueScore = revenueVerified
    ? revenueMtd > 0
      ? 85
      : 50
    : revenueMtd > 0
      ? 55
      : pipeline > 0
        ? 40
        : 25;
  const salesScore =
    bookingsMtd === 0 && staleInquiries === 0
      ? revenueMtd > 0
        ? 45
        : 20
      : staleInquiries === 0
        ? 80
        : staleInquiries <= 2
          ? 55
          : 30;
  const growthScore = traffic30 > 0 ? Math.min(80, 40 + Math.min(40, conversion * 8)) : 30;
  const dataScore = trustScore;
  const financeScore = payments.hasPayments
    ? Math.min(90, 55 + Math.min(35, payments.count * 5))
    : revenueVerified
      ? 60
      : 28;
  const marketingScore = growthScore;
  const websiteScore =
    conversion > 2 ? 70 : conversion > 0 ? 50 : traffic30 > 0 ? 40 : 25;
  const operationsScore =
    staleInquiries === 0 && verification.verifiedPct >= 40
      ? 75
      : staleInquiries <= 2
        ? 50
        : 30;
  const brandScore = Math.min(
    80,
    35 + (num(m["sessions.applications"]?.value) > 0 ? 20 : 0) + (bookingsMtd > 0 ? 15 : 0)
  );
  const overallScore = Math.round(
    revenueScore * 0.12 +
      financeScore * 0.13 +
      salesScore * 0.15 +
      marketingScore * 0.1 +
      websiteScore * 0.1 +
      operationsScore * 0.1 +
      brandScore * 0.08 +
      dataScore * 0.12 +
      growthScore * 0.1
  );

  const dim = (score: number, note: string): HealthDimension => ({
    score,
    label: labelFor(score),
    note,
  });

  const recommendations = guarded
    .filter((r) => !r.deprioritized)
    .filter((r) => {
      // Defense: never surface invented inquiry missions when measured queue is empty.
      if (staleInquiries > 0) return true;
      const t = r.title.toLowerCase();
      return !(
        (/pending booking|stale booking|abandoned booking/.test(t) && /inquir/.test(t)) ||
        (/respond to \d+/.test(t) && /inquir/.test(t))
      );
    })
    .map((r) => toNextAction(r, learningByRef));
  const nextAction = recommendations[0] ?? null;

  const leakExposure = totalLeakExposure(leakList);
  const confidence = buildConfidencePanel({
    verifiedDataPct: verification.verifiedPct,
    historicalFit: Math.min(100, recommendations.length * 12 + 30),
    externalSourcesPct: connectorList.length > 0 ? (healthy / connectorList.length) * 100 : 0,
    predictionStability: 70,
    knowledgeCoverage: Math.min(100, verification.verifiedPct + 10),
    missingInfoPenalty: degradedMetricRatio * 100,
    blockers: [
      ...(!payments.hasPayments && !revenueVerified ? ["Settled payments missing"] : []),
      ...(verification.verifiedPct < 20 && verification.total > 20
        ? ["Knowledge verification below 20%"]
        : []),
    ],
  });

  const risks: RiskSignal[] = [];
  if (staleInquiries > 0) {
    const followUpValue = num(m["attention.followUpValue"]?.value);
    const potentialImpact =
      followUpValue > 0 ? Math.round(followUpValue * Math.min(staleInquiries, 5)) : 0;
    const evidence = [
      `Truth metric attention.staleInquiries = ${staleInquiries}`,
      "Source: Submission table (verified count)",
      ...(followUpValue > 0
        ? [`Follow-up value basis $${followUpValue.toLocaleString()} (Estimated)`]
        : ["Dollar impact Unknown — no follow-up value basis"]),
    ];
    risks.push({
      id: "risk-stale-inquiries",
      title: `${staleInquiries} stale booking inquir${staleInquiries === 1 ? "y" : "ies"}`,
      detail: "Leads waiting 3+ days without a response — conversion probability drops daily.",
      severity: staleInquiries >= 3 ? "critical" : "high",
      evidence,
      href: "/admin/submissions?type=booking",
      actionLabel: "Advance to Consultation",
      potentialImpact,
      confidence: 0.88,
      costOfIgnore: buildCostOfIgnore({
        estimatedRevenue: potentialImpact,
        potentialImpact,
        confidence: 0.88,
        severity: staleInquiries >= 3 ? "critical" : "high",
        category: "sales",
        evidence,
        why: "Unanswered demand cools daily",
        kind: "risk",
      }),
      expectedOutcome: "Recover warm pipeline before leads go cold",
      reasoning: "Response latency is the highest-leverage sales variable for a studio with open inquiries.",
      prediction: `Ignoring risks ~$${Math.round(potentialImpact * 0.72).toLocaleString()} opportunity loss`,
      likelihood: 0.9,
      owner: "Studio owner",
      deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
      recoveryPlan: "Contact every stale inquiry within 48 hours; advance stage or archive with reason.",
      verification: "Recount stale inquiries after follow-up window using Submission timestamps.",
      domain: "Bookings",
    });
  }
  if (revenueMtd === 0 && pipeline > 0) {
    const evidence = [
      revenueVerified ? "Revenue verified at $0" : "Revenue estimated at $0 (Stripe disconnected)",
      `Open pipeline: $${pipeline.toLocaleString()}`,
    ];
    risks.push({
      id: "risk-zero-revenue",
      title: "No settled revenue MTD with open pipeline",
      detail: `$${pipeline.toLocaleString()} in estimated pipeline — sales recovery before marketing spend.`,
      severity: "high",
      evidence,
      href: "/admin/pipeline",
      actionLabel: "Open pipeline",
      potentialImpact: Math.round(pipeline * 0.4),
      confidence: revenueVerified ? 0.9 : 0.7,
      costOfIgnore: buildCostOfIgnore({
        estimatedRevenue: Math.round(pipeline * 0.4),
        potentialImpact: Math.round(pipeline * 0.4),
        confidence: revenueVerified ? 0.9 : 0.7,
        severity: "high",
        category: "revenue",
        evidence,
        kind: "risk",
      }),
      expectedOutcome: "Convert open pipeline into settled revenue",
      reasoning: "Pipeline without cash conversion is a false sense of health.",
      prediction: `~$${Math.round(pipeline * 0.4).toLocaleString()} at risk if sales stall`,
      likelihood: 0.7,
      owner: "Studio owner",
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      recoveryPlan: "Prioritize consultation → proposal → deposit for highest-value open inquiries.",
      verification: "Settled Payment.amountCents MTD must increase while pipeline stages advance.",
      domain: "Cash Flow",
    });
  }
  if (verification.verifiedPct < 50 && verification.total > 20) {
    const evidence = [
      `${verification.pending} memories pending`,
      `Target: ${verification.targetPct}%`,
    ];
    risks.push({
      id: "risk-unverified-memory",
      title: `Knowledge only ${verification.verifiedPct}% verified`,
      detail: "AI recommendations may rely on unverified memories — review the verification queue.",
      severity: verification.verifiedPct < 20 ? "high" : "medium",
      evidence,
      href: "/admin/memory",
      actionLabel: "Verify knowledge",
      potentialImpact: 0,
      confidence: 0.8,
      costOfIgnore: buildCostOfIgnore({
        estimatedRevenue: 0,
        confidence: 0.8,
        severity: verification.verifiedPct < 20 ? "high" : "medium",
        category: "operations",
        evidence,
        why: "Unverified knowledge quietly lowers recommendation trust",
        kind: "risk",
      }),
      expectedOutcome: "Raise knowledge trust so recommendations stay explainable",
      reasoning: "Business Brain confidence is capped by verification coverage.",
      prediction: "Composite AI confidence stays medium/low until verified ≥ target",
      likelihood: 0.75,
      owner: "Studio owner",
      deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
      recoveryPlan: "Verify pending memories in batches; reject unverifiable claims.",
      verification: "Verification queue verifiedPct must reach targetPct.",
      domain: "AI",
    });
  }
  for (const label of degradedLabels.slice(0, 3)) {
    const evidence = blockedDecisions.slice(0, 2);
    risks.push({
      id: `risk-connector-${label.toLowerCase().replace(/\s+/g, "-")}`,
      title: `${label} disconnected or degraded`,
      detail: "External intelligence incomplete — decisions that depend on this source are blocked or estimated.",
      severity: "medium",
      evidence: evidence.length ? evidence : [`${label} health ≠ healthy`],
      href: "/admin/qa",
      actionLabel: "Check connectors",
      potentialImpact: 0,
      confidence: 0.85,
      costOfIgnore: buildCostOfIgnore({
        estimatedRevenue: 0,
        confidence: 0.85,
        severity: "medium",
        category: "technical",
        evidence: evidence.length ? evidence : [`${label} disconnected`],
        kind: "risk",
      }),
      expectedOutcome: "Restore source so blocked decisions become Verified",
      reasoning: "Missing connectors force Estimated/Unknown labels on dependent claims.",
      prediction: "Related forecasts remain capped until reconnect",
      likelihood: 0.8,
      owner: "Studio owner",
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      recoveryPlan: `Restore ${label} connector health via Executive QA.`,
      verification: `${label} connector status must return to healthy.`,
      domain: label.toLowerCase().includes("stripe") || label.toLowerCase().includes("payment")
        ? "Payments"
        : "Technology",
    });
  }

  const headline =
    nextAction?.title ??
    (staleInquiries > 0
      ? `${staleInquiries} stale inquir${staleInquiries === 1 ? "y" : "ies"} need follow-up — sales recovery is the priority.`
      : bookingsMtd === 0 && revenueMtd === 0
        ? "No booking pipeline yet — drive acquisition for the first real inquiry."
        : revenueMtd > 0
          ? `Revenue tracking${revenueVerified ? " (verified)" : " (estimated from pipeline)"} · ${bookingsMtd} bookings MTD.`
          : `No settled revenue yet MTD · $${pipeline.toLocaleString()} open pipeline.`);

  const context: ExecutiveContext = {
    generatedAt: new Date().toISOString(),
    truth,
    connectors: {
      total: connectorList.length,
      healthy,
      degraded,
      disconnected,
      degradedLabels,
      blockedDecisions,
    },
    verification: {
      total: verification.total,
      verifiedPct: verification.verifiedPct,
      targetPct: verification.targetPct,
      pending: verification.pending,
      verified: verification.verified,
      trusted: verification.trusted,
    },
    health: {
      overall: dim(
        overallScore,
        "Weighted: Sales 15% · Finance 13% · Revenue 12% · Data 12% · Marketing/Growth/Website/Ops/Brand"
      ),
      revenue: dim(
        revenueScore,
        revenueVerified
          ? "Verified revenue from settled payments"
          : "Estimated from pipeline deal values (Stripe disconnected)"
      ),
      sales: dim(
        salesScore,
        staleInquiries === 0 ? "No stale inquiries" : `${staleInquiries} inquiries awaiting response`
      ),
      growth: dim(
        growthScore,
        traffic30 > 0
          ? `${traffic30.toLocaleString()} pageviews / 30d · ${conversion}% conversion`
          : "No traffic data"
      ),
      data: dim(
        dataScore,
        `${verification.verifiedPct}% knowledge verified · ${healthy}/${connectorList.length} sources healthy`
      ),
      finance: dim(
        financeScore,
        payments.hasPayments
          ? `${payments.count} settled Payment row(s)`
          : "No Payment rows — cash truth incomplete"
      ),
      marketing: dim(marketingScore, "Derived from traffic + conversion until email/ads connect"),
      website: dim(
        websiteScore,
        conversion > 0 ? `${conversion}% conversion` : "Conversion unknown or zero"
      ),
      operations: dim(
        operationsScore,
        staleInquiries === 0 ? "Inbox clear" : "Follow-up debt present"
      ),
      brand: dim(brandScore, "Sessions applications + booking momentum proxy"),
    },
    confidence,
    leaks: {
      loss: Math.round(leakExposure.loss),
      recoverable: Math.round(leakExposure.recoverable),
      count: leakList.length,
    },
    partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
    headline,
    nextAction,
    recommendations,
    risks,
    trustScore,
  };

  await setCache(CACHE_KEY, context, CACHE_TTL_MS);
  return context;
}
