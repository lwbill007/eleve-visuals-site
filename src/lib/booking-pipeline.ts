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

export const INQUIRY_STATUS_LABELS: Record<ProductionStatus, string> = {
  lead: "Lead",
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

/** Pipeline columns (excludes archived from active board — shown as Inactive). */
export const PIPELINE_STAGES = [
  { id: "lead" as const, label: "Lead" },
  { id: "qualified" as const, label: "Qualified" },
  { id: "discovery" as const, label: "Discovery" },
  { id: "proposal" as const, label: "Proposal" },
  { id: "booked" as const, label: "Booked" },
  { id: "planning" as const, label: "Planning" },
  { id: "production" as const, label: "Production" },
  { id: "editing" as const, label: "Editing" },
  { id: "delivered" as const, label: "Delivered" },
  { id: "follow_up" as const, label: "Follow-up" },
  { id: "archived" as const, label: "Inactive" },
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

/** Statuses that count as "pending pipeline" for workboard. */
export const WORKBOARD_OPEN_STATUSES: string[] = [
  "lead",
  "qualified",
  "discovery",
  "proposal",
  "new",
  "contacted",
];

/** Public post-submit timeline stages (client-facing). */
export const CLIENT_TIMELINE_STAGES = [
  { id: "lead", label: "Inquiry Received" },
  { id: "discovery", label: "Discovery Review" },
  { id: "proposal", label: "Proposal" },
  { id: "booked", label: "Booked" },
  { id: "planning", label: "Planning" },
  { id: "production", label: "Production" },
  { id: "editing", label: "Editing" },
  { id: "delivered", label: "Delivery" },
] as const;

const CLIENT_ORDER = CLIENT_TIMELINE_STAGES.map((s) => s.id);

/** Index of current stage in client timeline (−1 if archived). */
export function clientTimelineIndex(status: string): number {
  const n = normalizeInquiryStatus(status);
  if (n === "archived") return -1;
  if (n === "qualified") return CLIENT_ORDER.indexOf("discovery");
  if (n === "follow_up") return CLIENT_ORDER.indexOf("delivered");
  const idx = CLIENT_ORDER.indexOf(n as (typeof CLIENT_ORDER)[number]);
  return idx >= 0 ? idx : 0;
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
