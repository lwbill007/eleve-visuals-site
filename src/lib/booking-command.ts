/**
 * Booking Command Center — derived ops intel from Submission + qualification.
 * No new SoT entity: everything extends Submission.data.
 */

import { getAddOnById, getPackageById, formatPackagePrice } from "./booking-packages";
import {
  INQUIRY_STATUS_LABELS,
  normalizeInquiryStatus,
} from "./booking-pipeline";

export type OpportunityGrade = "A+" | "A" | "B" | "C" | "D";

/** Legacy ops timeline (kept for compatibility). */
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

/** Client-facing production journey for Booking Details. */
export const CLIENT_JOURNEY_TIMELINE = [
  { id: "inquiry", label: "Inquiry", statuses: ["lead"] },
  { id: "consultation", label: "Creative Consultation", statuses: ["qualified", "discovery"] },
  { id: "proposal", label: "Proposal", statuses: ["proposal"] },
  { id: "deposit", label: "Deposit", statuses: [] },
  { id: "planning", label: "Creative Planning", statuses: ["planning"] },
  { id: "moodboard", label: "Moodboard", statuses: [] },
  { id: "production", label: "Production", statuses: ["booked", "production"] },
  { id: "editing", label: "Editing", statuses: ["editing"] },
  { id: "preview", label: "Preview Gallery", statuses: [] },
  { id: "delivery", label: "Final Delivery", statuses: ["delivered"] },
  { id: "review", label: "Review", statuses: ["follow_up"] },
  { id: "partnership", label: "Future Partnership", statuses: [] },
] as const;

export type BookingTaskPriority = "high" | "medium" | "low";
export type BookingTaskStatus = "todo" | "upcoming" | "done" | "overdue";

export interface BookingTask {
  id: string;
  title: string;
  priority: BookingTaskPriority;
  owner: string;
  dueDate: string;
  status: BookingTaskStatus;
}

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
  tasks?: BookingTask[];
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

export function clientJourneyIndex(status: string, returning = false): number {
  const n = normalizeInquiryStatus(status);
  if (returning && (n === "follow_up" || n === "delivered")) {
    return CLIENT_JOURNEY_TIMELINE.length - 1;
  }
  const idx = CLIENT_JOURNEY_TIMELINE.findIndex((s) =>
    (s.statuses as readonly string[]).includes(n)
  );
  if (idx >= 0) return idx;
  if (n === "booked") return 6;
  if (n === "planning") return 4;
  if (n === "editing") return 7;
  if (n === "delivered") return 9;
  if (n === "follow_up") return 10;
  if (n === "proposal") return 2;
  if (n === "discovery" || n === "qualified") return 1;
  return 0;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Seed actionable tasks when none are stored yet. */
export function defaultBookingTasks(input: {
  status: string;
  assignedTo?: string;
  hasRefs: boolean;
  hasDate: boolean;
  priority: string;
}): BookingTask[] {
  const owner = input.assignedTo || "Billy";
  const urgent = input.priority === "urgent" || input.priority === "high";
  const tasks: BookingTask[] = [
    {
      id: "outreach",
      title: "Personal outreach / discovery invite",
      priority: urgent ? "high" : "medium",
      owner,
      dueDate: isoDaysFromNow(urgent ? 0 : 1),
      status: "todo",
    },
  ];
  if (!input.hasRefs) {
    tasks.push({
      id: "request-refs",
      title: "Request moodboard & visual references",
      priority: "high",
      owner,
      dueDate: isoDaysFromNow(1),
      status: "todo",
    });
  }
  if (!input.hasDate) {
    tasks.push({
      id: "confirm-dates",
      title: "Confirm preferred production dates",
      priority: "medium",
      owner,
      dueDate: isoDaysFromNow(2),
      status: "upcoming",
    });
  }
  tasks.push({
    id: "discovery-call",
    title: "Hold creative consultation",
    priority: urgent ? "high" : "medium",
    owner,
    dueDate: isoDaysFromNow(3),
    status: "upcoming",
  });
  tasks.push({
    id: "proposal",
    title: "Draft tailored proposal (after discovery)",
    priority: "medium",
    owner,
    dueDate: isoDaysFromNow(5),
    status: "upcoming",
  });

  const today = new Date().toISOString().slice(0, 10);
  return tasks.map((t) => {
    if (t.status === "done") return t;
    if (t.dueDate < today) return { ...t, status: "overdue" as const };
    if (t.dueDate === today) return { ...t, status: "todo" as const };
    return t;
  });
}

export function groupBookingTasks(tasks: BookingTask[]) {
  const today = new Date().toISOString().slice(0, 10);
  const normalized = tasks.map((t) => {
    if (t.status === "done") return t;
    if (t.dueDate < today) return { ...t, status: "overdue" as const };
    if (t.dueDate === today && t.status === "upcoming") return { ...t, status: "todo" as const };
    return t;
  });
  return {
    today: normalized.filter((t) => t.status === "todo" || (t.status !== "done" && t.dueDate === today)),
    upcoming: normalized.filter((t) => t.status === "upcoming" && t.dueDate > today),
    completed: normalized.filter((t) => t.status === "done"),
    overdue: normalized.filter((t) => t.status === "overdue"),
  };
}

export interface ActivityEvent {
  id: string;
  at: string;
  label: string;
  detail?: string;
}

export function buildActivityTimeline(input: {
  createdAt?: string;
  status: string;
  qualificationGeneratedAt?: string;
  internalLog?: { at: string; text: string }[];
  packageName?: string;
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  if (input.createdAt) {
    events.push({
      id: "inquiry",
      at: input.createdAt,
      label: "Inquiry Submitted",
      detail: input.packageName ? `Experience interest: ${input.packageName}` : undefined,
    });
  }
  if (input.qualificationGeneratedAt) {
    events.push({
      id: "qualified",
      at: input.qualificationGeneratedAt,
      label: "Lead Qualified",
      detail: "AI lead analysis generated",
    });
    events.push({
      id: "ai-analysis",
      at: input.qualificationGeneratedAt,
      label: "AI Analysis Generated",
    });
  }
  for (const log of input.internalLog || []) {
    events.push({
      id: `log-${log.at}`,
      at: log.at,
      label: "Internal Update",
      detail: log.text,
    });
  }
  const n = normalizeInquiryStatus(input.status);
  const statusStamp = new Date().toISOString();
  const statusEvents: Record<string, string> = {
    discovery: "Discovery Scheduled",
    proposal: "Proposal Created",
    booked: "Deposit / Booking Confirmed",
    production: "Production In Progress",
    editing: "Editing Started",
    delivered: "Gallery Delivered",
    follow_up: "Follow-Up Opened",
  };
  if (statusEvents[n] && n !== "lead") {
    events.push({
      id: `status-${n}`,
      at: statusStamp,
      label: statusEvents[n],
      detail: "Current pipeline stage",
    });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
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
      detail: "Invoice automation not connected — create via Financial Center / Email",
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
      detail: "Link payment manually in Financial Center — no silent auto-charge",
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
  const n = normalizeInquiryStatus(status);
  return INQUIRY_STATUS_LABELS[n] || status;
}
