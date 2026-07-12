/**
 * Booking Command Center — derived ops intel from Submission + qualification.
 * No new SoT entity: everything extends Submission.data.
 */

import { getAddOnById, getPackageById, formatPackagePrice } from "./booking-packages";
import { normalizeInquiryStatus, type ProductionStatus } from "./booking-pipeline";

export type OpportunityGrade = "A+" | "A" | "B" | "C" | "D";

export const BOOKING_OPS_TIMELINE = [
  { id: "inquiry", label: "Inquiry Submitted", statuses: ["lead"] },
  { id: "discovery_scheduled", label: "Discovery Scheduled", statuses: ["qualified"] },
  { id: "discovery_done", label: "Discovery Completed", statuses: ["discovery"] },
  { id: "proposal_sent", label: "Proposal Sent", statuses: ["proposal"] },
  { id: "proposal_approved", label: "Proposal Approved", statuses: [] },
  { id: "invoice_paid", label: "Invoice Paid", statuses: [] },
  { id: "contract_signed", label: "Contract Signed", statuses: [] },
  { id: "shoot_scheduled", label: "Shoot Scheduled", statuses: ["booked"] },
  { id: "production", label: "Production", statuses: ["planning", "production"] },
  { id: "editing", label: "Editing", statuses: ["editing"] },
  { id: "review", label: "Review", statuses: [] },
  { id: "delivered", label: "Delivered", statuses: ["delivered"] },
  { id: "completed", label: "Completed", statuses: [] },
  { id: "follow_up", label: "Follow-Up", statuses: ["follow_up"] },
  { id: "repeat", label: "Repeat Client", statuses: [] },
] as const;

export type HealthKey =
  | "moodboard"
  | "brandAssets"
  | "visualRefs"
  | "contract"
  | "invoice"
  | "questionnaire"
  | "payment"
  | "timeline"
  | "permissions";

export type HealthStatus = "ready" | "warn" | "missing" | "deferred";

export interface HealthItem {
  key: HealthKey;
  label: string;
  status: HealthStatus;
  detail: string;
  requestSubject?: string;
}

export interface BookingOpsState {
  discoveryAnswers?: Record<string, string>;
  checklist?: Record<string, boolean>;
  team?: {
    leadPhotographer?: string;
    secondShooter?: string;
    videographer?: string;
    editor?: string;
    creativeDirector?: string;
    assistant?: string;
  };
  projectName?: string;
  assignedTo?: string;
  preferredContact?: string;
  timezone?: string;
  internalLog?: { at: string; text: string }[];
}

export function opportunityGrade(leadScore: number): OpportunityGrade {
  if (leadScore >= 90) return "A+";
  if (leadScore >= 75) return "A";
  if (leadScore >= 60) return "B";
  if (leadScore >= 40) return "C";
  return "D";
}

export function gradeTone(grade: OpportunityGrade): string {
  if (grade === "A+" || grade === "A") return "text-emerald-300 border-emerald-400/40";
  if (grade === "B") return "text-accent border-accent/40";
  if (grade === "C") return "text-amber-300 border-amber-400/40";
  return "text-red-300 border-red-400/40";
}

export function opsTimelineIndex(status: string, returning = false): number {
  const n = normalizeInquiryStatus(status);
  if (returning && n === "follow_up") return BOOKING_OPS_TIMELINE.length - 1;
  const idx = BOOKING_OPS_TIMELINE.findIndex((s) =>
    (s.statuses as readonly string[]).includes(n)
  );
  if (idx >= 0) return idx;
  // Approximate for stages without dedicated status
  if (n === "proposal") return 3;
  if (n === "booked") return 7;
  if (n === "delivered") return 11;
  if (n === "follow_up") return 13;
  return 0;
}

export function buildHealth(data: Record<string, unknown>): HealthItem[] {
  const has = (k: string) => typeof data[k] === "string" && String(data[k]).trim().length > 0;
  const feeling = has("feelingPrompt") || has("projectVision") || has("purpose");
  const refs = has("moodBoardUrl") || has("pinterestLink") || has("driveLink") || has("inspirationInstagram");
  const terms = data.termsAccepted === true;

  return [
    {
      key: "moodboard",
      label: "Mood Board",
      status: has("moodBoardUrl") ? "ready" : refs ? "warn" : "missing",
      detail: has("moodBoardUrl") ? "Mood board linked" : "No mood board URL yet",
      requestSubject: "ÉLEVÉ — Mood board request",
    },
    {
      key: "brandAssets",
      label: "Brand Assets",
      status: has("website") || has("driveLink") ? "warn" : "missing",
      detail: has("driveLink") ? "Drive linked — confirm brand kit" : "Logo / guidelines not attached",
      requestSubject: "ÉLEVÉ — Brand assets request",
    },
    {
      key: "visualRefs",
      label: "Visual References",
      status: refs ? "ready" : "missing",
      detail: refs ? "References attached" : "No visual references",
      requestSubject: "ÉLEVÉ — Visual references request",
    },
    {
      key: "contract",
      label: "Contract",
      status: terms ? "warn" : "missing",
      detail: terms
        ? "Terms accepted at inquiry — formal contract not generated"
        : "No contract on file",
      requestSubject: "ÉLEVÉ — Project agreement",
    },
    {
      key: "invoice",
      label: "Invoice",
      status: "deferred",
      detail: "Invoice automation not connected — create via Payments / Email",
      requestSubject: "ÉLEVÉ — Invoice",
    },
    {
      key: "questionnaire",
      label: "Questionnaire",
      status: feeling ? "ready" : "missing",
      detail: feeling ? "Vision answers captured" : "Discovery questionnaire incomplete",
      requestSubject: "ÉLEVÉ — Discovery questionnaire",
    },
    {
      key: "payment",
      label: "Payment / Retainer",
      status: "deferred",
      detail: "Link payment manually in Payments — no silent auto-charge",
      requestSubject: "ÉLEVÉ — Retainer payment",
    },
    {
      key: "timeline",
      label: "Timeline",
      status: has("preferredDate") ? "ready" : "missing",
      detail: has("preferredDate")
        ? `Preferred ${String(data.preferredDate)}`
        : "No shoot date preference",
    },
    {
      key: "permissions",
      label: "Permissions",
      status: "warn",
      detail: "Usage / release permissions not tracked yet",
      requestSubject: "ÉLEVÉ — Usage permissions",
    },
  ];
}

export function buildRevenue(data: Record<string, unknown>) {
  const packageId = typeof data.packageId === "string" ? data.packageId : "";
  const addOnIds = Array.isArray(data.addOnIds)
    ? data.addOnIds.filter((x): x is string => typeof x === "string")
    : [];
  const pkg = getPackageById(packageId);
  const q = data.qualification as { estimatedProjectValue?: number; potentialLifetimeValue?: number } | undefined;
  const addOns = addOnIds.map((id) => {
    const a = getAddOnById(id);
    return { id, name: a?.name || id, price: a?.startingPrice ?? 0 };
  });
  const packagePrice = pkg?.startingPrice ?? 0;
  const addOnTotal = addOns.reduce((s, a) => s + a.price, 0);
  const total = q?.estimatedProjectValue ?? packagePrice + addOnTotal;
  const productionCost = Math.round(total * 0.28);
  const profit = Math.max(0, total - productionCost);
  const margin = total > 0 ? Math.round((profit / total) * 100) : 0;
  const ltv = q?.potentialLifetimeValue ?? Math.round(total * 1.8);

  return {
    packageName: pkg?.name || "Custom / TBD",
    packagePrice,
    addOns,
    addOnTotal,
    travel: 0,
    studio: 0,
    lighting: 0,
    extraHours: 0,
    rush: addOns.some((a) => a.id === "rush-editing") ? (getAddOnById("rush-editing")?.startingPrice ?? 0) : 0,
    tax: 0,
    discount: 0,
    total,
    productionCost,
    profit,
    margin,
    ltv,
    format: formatPackagePrice,
  };
}

export function buildOpportunityMetrics(data: Record<string, unknown>) {
  const q = data.qualification as Record<string, unknown> | undefined;
  const score = typeof q?.leadScore === "number" ? q.leadScore : 50;
  const value = typeof q?.estimatedProjectValue === "number" ? q.estimatedProjectValue : 0;
  const pkg = getPackageById(typeof data.packageId === "string" ? data.packageId : "");
  const complexity =
    pkg?.family === "partnership" ? 92 : pkg?.family === "hybrid" ? 78 : pkg?.family === "motion" ? 70 : 55;
  const scheduling =
    typeof data.preferredDate === "string" && data.preferredDate ? 40 : 75;
  const risk = Array.isArray(q?.risks) ? Math.min(90, 30 + (q.risks as unknown[]).length * 12) : 35;
  const hours =
    typeof (data as { qualification?: { estimatedProjectValue?: number } }).qualification === "object"
      ? pkg?.family === "partnership"
        ? pkg.id === "legacy"
          ? 40
          : 12
        : pkg?.startingPrice && pkg.startingPrice >= 900
          ? 10
          : pkg?.startingPrice && pkg.startingPrice >= 500
            ? 6
            : 3
      : 4;

  return [
    {
      key: "leadScore",
      label: "Lead Score",
      value: `${score}/100`,
      explain: "Rules-based from package, brief completeness, and digital footprint.",
    },
    {
      key: "grade",
      label: "Opportunity Grade",
      value: opportunityGrade(score),
      explain: "A+/A = pursue now · B = strong · C = nurture · D = low priority.",
    },
    {
      key: "portfolio",
      label: "Portfolio Value",
      value: score >= 70 ? "High" : score >= 50 ? "Medium" : "Low",
      explain: "Likelihood this project elevates the ÉLEVÉ portfolio.",
    },
    {
      key: "brand",
      label: "Brand Potential",
      value: pkg?.family === "partnership" || pkg?.family === "hybrid" ? "High" : "Medium",
      explain: "Fit for ongoing brand / partnership work.",
    },
    {
      key: "complexity",
      label: "Creative Complexity",
      value: `${complexity}/100`,
      explain: "Estimated production and creative demand.",
    },
    {
      key: "scheduling",
      label: "Scheduling Difficulty",
      value: `${scheduling}/100`,
      explain: "Higher when date flexibility or access is unclear.",
    },
    {
      key: "risk",
      label: "Production Risk",
      value: `${risk}/100`,
      explain: "Gaps, weather exposure, scope ambiguity.",
    },
    {
      key: "hours",
      label: "Estimated Hours",
      value: String(hours),
      explain: "Rough production hours from package family (estimated).",
    },
    {
      key: "profit",
      label: "Estimated Profit",
      value: formatPackagePrice(Math.max(0, Math.round(value * 0.72))),
      explain: "~72% contribution after typical production cost model (estimated).",
    },
    {
      key: "ltv",
      label: "Lifetime Value",
      value: formatPackagePrice(
        typeof q?.potentialLifetimeValue === "number" ? q.potentialLifetimeValue : Math.round(value * 1.8)
      ),
      explain: "Projected relationship value if retained (estimated).",
    },
    {
      key: "forecast",
      label: "Revenue Forecast",
      value: formatPackagePrice(value),
      explain: "Package + add-ons starting value (estimated).",
    },
    {
      key: "referral",
      label: "Referral Potential",
      value: typeof data.referralSource === "string" && /referral|friend|returning/i.test(data.referralSource)
        ? "High"
        : "Medium",
      explain: "Warm channels close faster and refer more often.",
    },
    {
      key: "repeat",
      label: "Repeat Probability",
      value: pkg?.family === "partnership" ? "Very High" : score >= 70 ? "High" : "Medium",
      explain: "Chance of follow-on work after delivery.",
    },
  ];
}

export const DISCOVERY_QUESTIONS = [
  { id: "emotions", prompt: "What emotions should this campaign create?" },
  { id: "audience", prompt: "Who is your target audience?" },
  { id: "publish", prompt: "Where will this content be published?" },
  { id: "approver", prompt: "Who approves final creative?" },
  { id: "deadline", prompt: "Is there a launch deadline?" },
  { id: "inspire", prompt: "What brands or work inspire this project?" },
] as const;

export const PRE_SHOOT_CHECKLIST = [
  "Charge batteries",
  "Clean sensors",
  "Pack lenses",
  "Confirm location",
  "Confirm client",
  "Backup cards",
  "Weather check",
] as const;

export const POST_SHOOT_CHECKLIST = [
  "Backup files",
  "Cull images",
  "Edit",
  "Export",
  "Upload",
  "Deliver gallery",
  "Request review",
  "Request referral",
  "Mark complete",
] as const;

export function parseOps(data: Record<string, unknown>): BookingOpsState {
  const raw = data.ops;
  if (!raw || typeof raw !== "object") return {};
  return raw as BookingOpsState;
}

export function statusLabel(status: string): string {
  const n = normalizeInquiryStatus(status) as ProductionStatus;
  const map: Record<string, string> = {
    lead: "Lead · Inquiry",
    qualified: "Qualified",
    discovery: "Discovery",
    proposal: "Proposal",
    booked: "Booked",
    planning: "Planning",
    production: "Production",
    editing: "Editing",
    delivered: "Delivered",
    follow_up: "Follow-up",
    archived: "Archived",
  };
  return map[n] || status;
}
