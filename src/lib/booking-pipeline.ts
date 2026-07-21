/**
 * Booking / inquiry production pipeline stages.
 * Extends the former 5-status model while preserving Submission as SoT.
 */

export const PRODUCTION_STATUSES = [
  "lead",
  "qualified",
  "discovery",
  "proposal",
  "booked",
  "planning",
  "production",
  "editing",
  "delivered",
  "follow_up",
  "archived",
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

/** Legacy inquiry statuses still present in the DB. */
export const LEGACY_INQUIRY_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "completed",
  "archived",
] as const;

export type LegacyInquiryStatus = (typeof LEGACY_INQUIRY_STATUSES)[number];

/** Statuses shown in admin selects / pipeline (production vocabulary). */
export const INQUIRY_STATUSES = PRODUCTION_STATUSES;
export type InquiryStatus = ProductionStatus;

/** Accept legacy or production status strings on write. */
export function isValidInquiryStatus(value: string): boolean {
  return (
    (PRODUCTION_STATUSES as readonly string[]).includes(value) ||
    (LEGACY_INQUIRY_STATUSES as readonly string[]).includes(value)
  );
}

/** Persist always as production status. */
export function coerceInquiryStatus(value: string): ProductionStatus {
  return normalizeInquiryStatus(value);
}

const LEGACY_TO_PRODUCTION: Record<string, ProductionStatus> = {
  new: "lead",
  contacted: "discovery",
  scheduled: "booked",
  completed: "delivered",
  archived: "archived",
};

/** Normalize any stored status to the production vocabulary. */
export function normalizeInquiryStatus(status: string): ProductionStatus {
  if ((PRODUCTION_STATUSES as readonly string[]).includes(status)) {
    return status as ProductionStatus;
  }
  return LEGACY_TO_PRODUCTION[status] ?? "lead";
}

/**
 * Display labels for the Work Pipeline vision:
 * Lead → Qualified → Consultation → Proposal → Booked → Completed → Archived.
 * Status IDs stay stable in the DB; Contract Sent / Deposit Paid are not yet
 * distinct statuses — surface those as MissingMetric on the Pipeline page.
 */
export const INQUIRY_STATUS_LABELS: Record<ProductionStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  discovery: "Consultation",
  proposal: "Proposal",
  booked: "Booked",
  planning: "Planning",
  production: "Production",
  editing: "Editing",
  delivered: "Completed",
  follow_up: "Follow-up",
  archived: "Archived",
};

export const INQUIRY_STATUS_COLORS: Record<ProductionStatus, string> = {
  lead: "text-amber-400 border-amber-400/40",
  qualified: "text-orange-300 border-orange-400/40",
  discovery: "text-sky-400 border-sky-400/40",
  proposal: "text-violet-300 border-violet-400/40",
  booked: "text-emerald-400 border-emerald-400/40",
  planning: "text-teal-300 border-teal-400/40",
  production: "text-cyan-300 border-cyan-400/40",
  editing: "text-indigo-300 border-indigo-400/40",
  delivered: "text-fog border-stone/40",
  follow_up: "text-accent border-accent/40",
  archived: "text-muted border-stone/30",
};

/**
 * Pipeline columns. Labels follow the sales vision where IDs map cleanly
 * (Consultation, Completed). Contract Sent / Deposit Paid are not status IDs —
 * show them as MissingMetric on PipelineClient, do not mislabel booked/planning.
 */
export const PIPELINE_STAGES = [
  { id: "lead" as const, label: INQUIRY_STATUS_LABELS.lead },
  { id: "qualified" as const, label: INQUIRY_STATUS_LABELS.qualified },
  { id: "discovery" as const, label: INQUIRY_STATUS_LABELS.discovery },
  { id: "proposal" as const, label: INQUIRY_STATUS_LABELS.proposal },
  { id: "booked" as const, label: INQUIRY_STATUS_LABELS.booked },
  { id: "planning" as const, label: INQUIRY_STATUS_LABELS.planning },
  { id: "production" as const, label: INQUIRY_STATUS_LABELS.production },
  { id: "editing" as const, label: INQUIRY_STATUS_LABELS.editing },
  { id: "delivered" as const, label: INQUIRY_STATUS_LABELS.delivered },
  { id: "follow_up" as const, label: INQUIRY_STATUS_LABELS.follow_up },
  { id: "archived" as const, label: INQUIRY_STATUS_LABELS.archived },
];

/** Open / needs-attention statuses (stale detection). */
export const OPEN_INQUIRY_STATUSES: ProductionStatus[] = [
  "lead",
  "qualified",
  "discovery",
  "proposal",
];

export const BOOKED_ACTIVE_STATUSES: ProductionStatus[] = [
  "booked",
  "planning",
  "production",
  "editing",
];

export const CLOSED_WON_STATUSES: ProductionStatus[] = ["delivered", "follow_up"];

/** Stored values that represent sales opportunities not yet booked. */
export const OPEN_PIPELINE_STORED_STATUSES = [
  ...OPEN_INQUIRY_STATUSES,
  "new",
  "contacted",
] as const;

export const PRODUCTION_VALUE_STORED_STATUSES = [
  ...BOOKED_ACTIVE_STATUSES,
  "scheduled",
] as const;

export const CLOSED_WON_STORED_STATUSES = [
  ...CLOSED_WON_STATUSES,
  "completed",
] as const;

/** Stored values that represent booked production or completed client value. */
export const PRODUCTION_OR_CLOSED_VALUE_STORED_STATUSES = [
  ...PRODUCTION_VALUE_STORED_STATUSES,
  ...CLOSED_WON_STORED_STATUSES,
] as const;

export function isOpenInquiryStatus(status: string): boolean {
  const n = normalizeInquiryStatus(status);
  return OPEN_INQUIRY_STATUSES.includes(n);
}

export function isBookedActiveStatus(status: string): boolean {
  return BOOKED_ACTIVE_STATUSES.includes(normalizeInquiryStatus(status));
}

export function isClosedWonStatus(status: string): boolean {
  return CLOSED_WON_STATUSES.includes(normalizeInquiryStatus(status));
}

export function isOpenPipelineValueStatus(status: string): boolean {
  return isOpenInquiryStatus(status);
}

export function isProductionOrClosedValueStatus(status: string): boolean {
  return isBookedActiveStatus(status) || isClosedWonStatus(status);
}

/** Statuses that count as "pending pipeline" for workboard. */
export const WORKBOARD_OPEN_STATUSES: readonly string[] = OPEN_PIPELINE_STORED_STATUSES;

/** Public post-submit journey (client-facing roadmap). */
export const CLIENT_TIMELINE_STAGES = [
  { id: "lead", label: "Inquiry" },
  { id: "discovery", label: "Creative Consultation" },
  { id: "proposal", label: "Proposal" },
  { id: "booked", label: "Retainer" },
  { id: "planning", label: "Creative Planning" },
  { id: "moodboard", label: "Moodboard" },
  { id: "production", label: "Production" },
  { id: "editing", label: "Editing" },
  { id: "preview", label: "Preview Gallery" },
  { id: "delivered", label: "Final Delivery" },
  { id: "review", label: "Review" },
  { id: "partnership", label: "Future Partnership" },
] as const;

const CLIENT_ORDER = CLIENT_TIMELINE_STAGES.map((s) => s.id);

/** Index of current stage in client timeline (−1 if archived). */
export function clientTimelineIndex(status: string): number {
  const n = normalizeInquiryStatus(status);
  if (n === "archived") return -1;
  // Map production statuses onto the richer public journey
  const map: Record<string, (typeof CLIENT_ORDER)[number]> = {
    lead: "lead",
    qualified: "discovery",
    discovery: "discovery",
    proposal: "proposal",
    booked: "booked",
    planning: "planning",
    production: "production",
    editing: "editing",
    delivered: "delivered",
    follow_up: "partnership",
  };
  const mapped = map[n] ?? "lead";
  return CLIENT_ORDER.indexOf(mapped);
}

/** High-level project categories for Step 2. */
export const PROJECT_CATEGORIES = [
  { id: "Portrait", label: "Portrait", description: "Editorial & personal portraiture" },
  { id: "Video", label: "Video", description: "Cinematic motion & content" },
  { id: "Hybrid", label: "Hybrid", description: "Photo + video in one production" },
  { id: "Event", label: "Event", description: "Live coverage & documentation" },
  { id: "Business Branding", label: "Business Branding", description: "Brand systems & campaigns" },
  { id: "Not Sure Yet", label: "Not Sure Yet", description: "We'll help define the brief" },
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]["id"];
