import type { BookingOptions } from "./types";
import { PROJECT_CATEGORIES, type ProjectCategory } from "./booking-pipeline";
import {
  budgetRangeFromPackage,
  deliverablesFromPackage,
  getPackageById,
} from "./booking-packages";

export const BOOKING_AUTOSAVE_KEY = "eleve-booking-draft-v3";

/** Booking Experience 2.0 — premium onboarding steps */
export const BOOKING_STEPS = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Customize" },
  { id: 4, label: "Vision" },
  { id: 5, label: "Details" },
  { id: 6, label: "About You" },
  { id: 7, label: "Review" },
] as const;

export interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  businessName: string;
  /** Selected package id from catalog */
  packageId: string;
  /** Selected add-on ids */
  addOnIds: string[];
  /** High-level production category (derived from package) */
  projectCategory: string;
  /** Optional detail services (legacy multi-select) */
  serviceTypes: string[];
  preferredDate: string;
  flexibleDate: string;
  location: string;
  sessionSetting: string;
  duration: string;
  /** Storytelling vision */
  feelingPrompt: string;
  inspirationPrompt: string;
  purpose: string;
  goals: string;
  audience: string;
  creativeDirection: string;
  /** Story / narrative — also fills legacy projectVision on submit */
  projectVision: string;
  pinterestLink: string;
  moodBoardUrl: string;
  inspirationInstagram: string;
  driveLink: string;
  deliverables: string[];
  budgetRange: string;
  projectTimeline: string;
  referralSource: string;
  termsAccepted: boolean;
  /** Welcome step acknowledged */
  welcomeAccepted: boolean;
}

export const initialBookingData: BookingFormData = {
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  website: "",
  businessName: "",
  packageId: "",
  addOnIds: [],
  projectCategory: "",
  serviceTypes: [],
  preferredDate: "",
  flexibleDate: "",
  location: "",
  sessionSetting: "",
  duration: "",
  feelingPrompt: "",
  inspirationPrompt: "",
  purpose: "",
  goals: "",
  audience: "",
  creativeDirection: "",
  projectVision: "",
  pinterestLink: "",
  moodBoardUrl: "",
  inspirationInstagram: "",
  driveLink: "",
  deliverables: [],
  budgetRange: "",
  projectTimeline: "",
  referralSource: "",
  termsAccepted: false,
  welcomeAccepted: false,
};

export function formatInquiryId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Normalize dashes/spaces so CMS "$300-500" matches package "$300–500". */
export function normalizeOptionKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—−‐‑]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve a value to the exact CMS option string when possible. */
export function matchOption(value: string, options: string[]): string {
  if (!value) return "";
  if (options.includes(value)) return value;
  const key = normalizeOptionKey(value);
  const exact = options.find((o) => normalizeOptionKey(o) === key);
  if (exact) return exact;
  return options.find((o) => {
    const ok = normalizeOptionKey(o);
    return ok.includes(key) || key.includes(ok);
  }) || value;
}

export function matchOptions(values: string[], options: string[]): string[] {
  const matched = values
    .map((v) => matchOption(v, options))
    .filter((v) => options.length === 0 || options.includes(v));
  return [...new Set(matched)];
}

/** Map category → serviceTypes for CMS enum compatibility. */
export function serviceTypesFromCategory(category: string, options: string[]): string[] {
  if (!category) return [];
  const match = options.find((o) => o.toLowerCase() === category.toLowerCase());
  if (match) return [match];
  return [category];
}

function suggestedDuration(packageId: string): string {
  const pkg = getPackageById(packageId);
  if (!pkg) return "1 Hour";
  if (pkg.family === "partnership") return "Full Day";
  if (pkg.startingPrice >= 900) return "Full Day";
  if (pkg.startingPrice >= 500) return "Half Day";
  if (pkg.startingPrice >= 300) return "2 Hours";
  return "1 Hour";
}

/** Apply package selection → category, budget, deliverables, duration hints. */
export function applyPackageSelection(
  data: BookingFormData,
  packageId: string,
  options: Pick<BookingOptions, "serviceTypes" | "deliverables" | "budgetRanges" | "durations">
): BookingFormData {
  const pkg = getPackageById(packageId);
  if (!pkg) return { ...data, packageId };

  const suggested = deliverablesFromPackage(pkg);
  const deliverables = matchOptions(suggested, options.deliverables);
  const rawBudget = budgetRangeFromPackage(packageId, data.addOnIds);
  const budgetRange = matchOption(rawBudget, options.budgetRanges) || rawBudget;
  const durationHint = matchOption(suggestedDuration(packageId), options.durations);

  return {
    ...data,
    packageId,
    projectCategory: pkg.projectCategory,
    serviceTypes: serviceTypesFromCategory(pkg.projectCategory, options.serviceTypes),
    budgetRange,
    deliverables: deliverables.length > 0 ? deliverables : data.deliverables,
    duration: data.duration
      ? matchOption(data.duration, options.durations) || data.duration
      : durationHint || data.duration,
  };
}

/**
 * Coerce form/API payload enums onto CMS option strings before Zod validation.
 * Prevents submit failures from en-dash vs hyphen and package-derived labels.
 */
export function normalizeBookingPayload(
  raw: Record<string, unknown>,
  options: BookingOptions
): Record<string, unknown> {
  const next = { ...raw };

  if (typeof next.sessionSetting === "string") {
    next.sessionSetting = matchOption(next.sessionSetting, options.sessionSettings);
  }
  if (typeof next.duration === "string") {
    next.duration = matchOption(next.duration, options.durations);
  }
  if (typeof next.budgetRange === "string") {
    next.budgetRange = matchOption(next.budgetRange, options.budgetRanges);
  }
  if (typeof next.referralSource === "string") {
    next.referralSource = matchOption(next.referralSource, options.referralSources);
  }
  if (Array.isArray(next.deliverables)) {
    next.deliverables = matchOptions(
      next.deliverables.filter((d): d is string => typeof d === "string"),
      options.deliverables
    );
  }
  if (Array.isArray(next.addOnIds)) {
    next.addOnIds = next.addOnIds.filter((id): id is string => typeof id === "string");
  } else if (next.addOnIds == null) {
    next.addOnIds = [];
  }

  // Ensure vision story meets min length when feelingPrompt is present
  if (
    typeof next.feelingPrompt === "string" &&
    next.feelingPrompt.trim().length >= 10 &&
    (typeof next.projectVision !== "string" || next.projectVision.trim().length < 10)
  ) {
    next.projectVision = next.feelingPrompt;
  }
  if (
    typeof next.feelingPrompt === "string" &&
    (!next.purpose || (typeof next.purpose === "string" && !next.purpose.trim()))
  ) {
    next.purpose = next.feelingPrompt;
  }
  if (
    typeof next.inspirationPrompt === "string" &&
    next.inspirationPrompt.trim() &&
    (!next.goals || (typeof next.goals === "string" && !next.goals.trim()))
  ) {
    next.goals = next.inspirationPrompt;
  }

  // Fallback deliverable if package mapping emptied the list
  if (
    Array.isArray(next.deliverables) &&
    next.deliverables.length === 0 &&
    options.deliverables[0]
  ) {
    next.deliverables = [options.deliverables[0]];
  }

  return next;
}

export function composeProjectVision(data: BookingFormData): string {
  const parts = [
    data.feelingPrompt && `Feeling: ${data.feelingPrompt}`,
    data.inspirationPrompt && `Inspiration: ${data.inspirationPrompt}`,
    data.purpose && `Purpose: ${data.purpose}`,
    data.goals && `Goals: ${data.goals}`,
    data.audience && `Audience: ${data.audience}`,
    data.creativeDirection && `Direction: ${data.creativeDirection}`,
    data.projectVision && `Story: ${data.projectVision}`,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join("\n\n");
  return data.projectVision.trim();
}

export { PROJECT_CATEGORIES };
export type { ProjectCategory };
