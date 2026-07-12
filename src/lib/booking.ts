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

/** Map category → serviceTypes for CMS enum compatibility. */
export function serviceTypesFromCategory(category: string, options: string[]): string[] {
  if (!category) return [];
  const match = options.find((o) => o.toLowerCase() === category.toLowerCase());
  if (match) return [match];
  return [category];
}

/** Apply package selection → category, budget, deliverables, duration hints. */
export function applyPackageSelection(
  data: BookingFormData,
  packageId: string,
  serviceTypeOptions: string[],
  deliverableOptions: string[] = []
): BookingFormData {
  const pkg = getPackageById(packageId);
  if (!pkg) return { ...data, packageId };
  const suggested = deliverablesFromPackage(pkg);
  const matched = suggested.filter((d) =>
    deliverableOptions.length === 0
      ? true
      : deliverableOptions.some((o) => o.toLowerCase() === d.toLowerCase())
  );
  return {
    ...data,
    packageId,
    projectCategory: pkg.projectCategory,
    serviceTypes: serviceTypesFromCategory(pkg.projectCategory, serviceTypeOptions),
    budgetRange: budgetRangeFromPackage(packageId, data.addOnIds),
    deliverables: matched.length > 0 ? matched : data.deliverables,
    duration:
      data.duration ||
      (pkg.family === "partnership"
        ? "Full Day"
        : pkg.startingPrice >= 500
          ? "Half Day"
          : pkg.startingPrice >= 300
            ? "2 Hours"
            : "1 Hour"),
  };
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
