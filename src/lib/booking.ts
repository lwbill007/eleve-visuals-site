import type { BookingOptions } from "./types";
import { PROJECT_CATEGORIES, type ProjectCategory } from "./booking-pipeline";
import {
  budgetRangeFromPackage,
  deliverablesFromPackage,
  getPackageById,
} from "./booking-packages";

export const BOOKING_AUTOSAVE_KEY = "eleve-booking-draft-v4";

/** Smart inquiry — 4 steps, CRM fields preserved via defaults */
export const BOOKING_STEPS = [
  { id: 1, label: "Service" },
  { id: 2, label: "Budget & Timing" },
  { id: 3, label: "Vision" },
  { id: 4, label: "Contact" },
] as const;

/** Public service intents shown in Step 1 — map to packages for CRM. */
export const INQUIRY_SERVICES = [
  {
    id: "portrait",
    label: "Portrait",
    description: "Editorial portraits, personal brand, lifestyle",
    packageId: "signature",
    projectCategory: "Portrait",
    isSessionVolume: false,
  },
  {
    id: "fashion",
    label: "Fashion",
    description: "Lookbooks, editorial fashion, creative campaigns",
    packageId: "prestige",
    projectCategory: "Portrait",
    isSessionVolume: false,
  },
  {
    id: "branding",
    label: "Branding",
    description: "Brand systems, founders, visual identity",
    packageId: "ascend",
    projectCategory: "Business Branding",
    isSessionVolume: false,
  },
  {
    id: "commercial",
    label: "Commercial",
    description: "Campaigns, product, and commercial production",
    packageId: "apex",
    projectCategory: "Business Branding",
    isSessionVolume: false,
  },
  {
    id: "event",
    label: "Event",
    description: "Experiences, launches, and live coverage",
    packageId: "fusion",
    projectCategory: "Event",
    isSessionVolume: false,
  },
  {
    id: "session",
    label: "Session Volume",
    description: "Apply to a curated ÉLEVÉ Sessions production",
    packageId: "prestige",
    projectCategory: "Portrait",
    isSessionVolume: true,
  },
] as const;

export type InquiryServiceId = (typeof INQUIRY_SERVICES)[number]["id"];

export function getInquiryService(id: string) {
  return INQUIRY_SERVICES.find((s) => s.id === id);
}

export interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  businessName: string;
  /** Selected package id from catalog (derived from service intent) */
  packageId: string;
  /** Step 1 public service intent */
  inquiryServiceId: string;
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
  inquiryServiceId: "",
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

/** Apply Step 1 service intent → package + CRM category. */
export function applyInquiryService(
  data: BookingFormData,
  serviceId: string,
  options: Pick<BookingOptions, "serviceTypes" | "deliverables" | "budgetRanges" | "durations">
): BookingFormData {
  const service = getInquiryService(serviceId);
  if (!service) return { ...data, inquiryServiceId: serviceId };

  const withPackage = applyPackageSelection(data, service.packageId, options);
  return {
    ...withPackage,
    inquiryServiceId: serviceId,
    projectCategory: service.projectCategory,
    serviceTypes: serviceTypesFromCategory(service.projectCategory, options.serviceTypes),
    creativeDirection: service.isSessionVolume
      ? [data.creativeDirection, "Interested in ÉLEVÉ Session Volume"].filter(Boolean).join("\n")
      : data.creativeDirection,
    welcomeAccepted: true,
  };
}

/**
 * Coerce form/API payload enums onto CMS option strings before Zod validation.
 * Prevents submit failures from en-dash vs hyphen and package-derived labels.
 * Fills inquiry-first defaults so short 4-step forms still satisfy CRM schema.
 */
export function normalizeBookingPayload(
  raw: Record<string, unknown>,
  options: BookingOptions
): Record<string, unknown> {
  const next = { ...raw };

  if (typeof next.inquiryServiceId === "string" && next.inquiryServiceId && !next.packageId) {
    const service = getInquiryService(next.inquiryServiceId);
    if (service) {
      next.packageId = service.packageId;
      next.projectCategory = service.projectCategory;
    }
  }

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

  if (
    typeof next.feelingPrompt === "string" &&
    next.feelingPrompt.trim().length >= 10 &&
    (typeof next.projectVision !== "string" || next.projectVision.trim().length < 10)
  ) {
    next.projectVision = next.feelingPrompt;
  }
  if (
    typeof next.feelingPrompt === "string" &&
    next.feelingPrompt.trim() &&
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

  next.welcomeAccepted = true;

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
