/**
 * Booking orchestration — Sales → Business → Creative → Production → Research → Summary
 * Rules-first specialist contributions with structured evidence (LLM optional later).
 */

import { buildLeadIntel } from "@/lib/booking-lead-intel";
import {
  buildEvidenceBundle,
  scoreConfidenceFromEvidence,
  type EvidenceItem,
} from "../evidence/schema";
import { recallAgentMemory } from "../agents/agent-memory";
import { toolNamesForAgent } from "../agents/tool-registry";
import { selectAgentsForTask, agentTitle } from "./select";
import { runVerificationPipeline } from "./pipeline";
import type {
  AgentRunRecord,
  OrchestratorAuditLog,
  OrchestratorResult,
  RecommendedAction,
} from "./types";

function eid(prefix: string, i: number) {
  return `${prefix}-${i}`;
}

export async function orchestrateBookingSubmission(input: {
  submissionId: string;
  data: Record<string, unknown>;
  email?: string;
}): Promise<OrchestratorResult> {
  const now = new Date().toISOString();
  const intel = buildLeadIntel(input.data);
  const q = (input.data.qualification as Record<string, unknown> | undefined) || {};
  const packageName =
    (typeof q.packageName === "string" && q.packageName) ||
    (typeof input.data.packageId === "string" && input.data.packageId) ||
    "Experience TBD";

  const evidenceItems: EvidenceItem[] = [
    {
      id: eid("pkg", 1),
      label: "Package",
      value: packageName,
      sourceType: "internal_booking",
      status: "verified",
    },
    {
      id: eid("val", 2),
      label: "Estimated investment",
      value: `$${intel.metrics.estimatedProjectValue.toLocaleString()}`,
      sourceType: "internal_booking",
      status: "estimated",
    },
    {
      id: eid("score", 3),
      label: "Lead score",
      value: String(intel.metrics.leadScore),
      sourceType: "ai_inference",
      status: "estimated",
    },
    {
      id: eid("addons", 4),
      label: "Add-ons",
      value: Array.isArray(input.data.addOnIds) && input.data.addOnIds.length
        ? `${input.data.addOnIds.length} selected`
        : "None",
      sourceType: "internal_booking",
      status: "verified",
    },
    {
      id: eid("refs", 5),
      label: "Visual references",
      value: intel.missingAssets.some((a) => a.label === "Visual References" && a.missing)
        ? "Missing"
        : "On file",
      sourceType: "internal_booking",
      status: intel.missingAssets.some((a) => a.label === "Visual References" && a.missing)
        ? "missing"
        : "verified",
    },
    {
      id: eid("date", 6),
      label: "Preferred date",
      value: typeof input.data.preferredDate === "string" ? input.data.preferredDate : "Not set",
      sourceType: "internal_booking",
      status: typeof input.data.preferredDate === "string" ? "verified" : "missing",
    },
    {
      id: eid("crm", 7),
      label: "CRM contact",
      value: input.email || (typeof input.data.email === "string" ? input.data.email : "Unknown"),
      sourceType: "internal_crm",
      status: input.email || typeof input.data.email === "string" ? "verified" : "missing",
    },
    {
      id: eid("web", 8),
      label: "Live market research",
      value: "Connector not wired for this pass",
      sourceType: "live_web",
      status: "missing",
    },
    {
      id: eid("hist", 9),
      label: "Historical CRM patterns",
      value: "Baseline partnership / premium patterns applied",
      sourceType: "historical_performance",
      status: "estimated",
    },
  ];

  const evidence = buildEvidenceBundle(intel.executiveSummary, evidenceItems);
  const confidence = scoreConfidenceFromEvidence(evidenceItems, {
    overall: intel.confidence,
    creative: Math.round(intel.confidence * 0.96),
    business: Math.min(99, Math.round(intel.confidence * 1.02)),
    research: Math.max(55, Math.round(intel.confidence * 0.82)),
    production: Math.round(intel.confidence * 0.94),
    sales: Math.min(98, Math.round(intel.confidence * 1.01)),
    reasoning: intel.scoreReasons.slice(0, 4),
  });

  const agentsSelected = selectAgentsForTask("booking_submitted");
  const agentRuns: AgentRunRecord[] = [];

  for (const agentId of agentsSelected) {
    const startedAt = new Date().toISOString();
    const memory = await recallAgentMemory(agentId, 4);
    const tools = toolNamesForAgent(agentId);
    let summary = "";
    let reasoning = "";
    let conf = confidence.overall;

    switch (agentId) {
      case "sales_advisor":
        summary = intel.salesStrategy.recommendedNextStep;
        reasoning = `${intel.salesStrategy.salesStrategy} Meeting: ${intel.salesStrategy.meetingType} (${intel.salesStrategy.estimatedLength}).`;
        conf = confidence.sales;
        break;
      case "business_strategist":
        summary = `Investment ~$${intel.metrics.estimatedProjectValue.toLocaleString()} · LTV ~$${intel.bookingIntelligence.estimatedLifetimeValue.toLocaleString()} · Grade ${intel.bookingIntelligence.opportunityGrade}`;
        reasoning = intel.salesStrategy.businessOpportunitySummary;
        conf = confidence.business;
        break;
      case "creative":
        summary = intel.brief.creativeDirection;
        reasoning = `Vision framed for production: ${intel.brief.primaryGoal}`;
        conf = confidence.creative;
        break;
      case "production_manager":
        summary = `Complexity: ${intel.creative.productionComplexity}. Scheduling: ${intel.bookingIntelligence.schedulingDifficulty}`;
        reasoning = intel.risks
          .filter((r) => r.level !== "Low")
          .map((r) => `${r.category}: ${r.recommendation}`)
          .join(" · ") || "No elevated production risks.";
        conf = confidence.production;
        break;
      case "research_specialist":
        summary =
          "Live web verification skipped — connector not wired. Using internal inquiry evidence only.";
        reasoning = memory;
        conf = confidence.research;
        break;
      default:
        summary = intel.executiveSummary;
        reasoning = "General executive review";
    }

    agentRuns.push({
      agentId,
      title: agentTitle(agentId),
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      summary,
      reasoning,
      evidenceIds: evidenceItems.slice(0, 5).map((e) => e.id),
      toolsAttempted: tools.filter((t) =>
        ["get_crm_contacts", "get_pipeline", "get_portfolio_summary", "search_business"].includes(t)
      ),
      confidence: conf,
    });
  }

  const mail = input.email || (typeof input.data.email === "string" ? input.data.email : "");
  const actions: RecommendedAction[] = [
    {
      id: "generate_proposal",
      label: "Generate Proposal",
      href: mail
        ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent("ÉLEVÉ Visuals — Project proposal")}`
        : "/admin/email",
      requiresApproval: true,
      priority: "high",
      ownerAgent: "sales_advisor",
    },
    {
      id: "schedule_discovery",
      label: "Schedule Discovery",
      href: mail
        ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent("ÉLEVÉ — Creative consultation")}`
        : "/admin/email",
      requiresApproval: true,
      priority: "high",
      ownerAgent: "sales_advisor",
    },
    {
      id: "request_moodboard",
      label: "Request Moodboard",
      href: mail
        ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent("ÉLEVÉ — Moodboard request")}`
        : "/admin/email",
      requiresApproval: true,
      priority: evidence.gaps.includes("Visual references") ||
      evidence.items.some((i) => i.label === "Visual references" && i.status === "missing")
        ? "high"
        : "medium",
      ownerAgent: "creative",
    },
    {
      id: "create_tasks",
      label: "Create Task",
      href: `/admin/bookings/${input.submissionId}`,
      requiresApproval: false,
      priority: "medium",
      ownerAgent: "production_manager",
    },
  ];

  const verificationSteps = await runVerificationPipeline({
    hasInternalData: true,
    evidence,
    needsLiveWeb: intel.metrics.estimatedProjectValue >= 900,
  });

  const audit: OrchestratorAuditLog = {
    id: `orch-booking-${input.submissionId}-${Date.now()}`,
    taskKind: "booking_submitted",
    createdAt: now,
    surface: "booking",
    agents: agentRuns,
    confidence,
    evidence,
    actions,
    executiveSummary: intel.executiveSummary,
    verificationSteps,
    provider: "rules",
  };

  return {
    audit,
    executiveSummary: intel.executiveSummary,
    confidence,
    evidence,
    actions,
  };
}
