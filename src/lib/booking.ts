import { PROJECT_CATEGORIES, type ProjectCategory } from "./booking-pipeline";

export const BOOKING_AUTOSAVE_KEY = "eleve-booking-draft-v2";

export const BOOKING_STEPS = [
  { id: 1, label: "About You" },
  { id: 2, label: "Creating" },
  { id: 3, label: "Vision" },
  { id: 4, label: "Inspiration" },
  { id: 5, label: "Planning" },
  { id: 6, label: "Investment" },
  { id: 7, label: "Review" },
] as const;

export interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  /** High-level production category */
  projectCategory: string;
  /** Optional detail services (legacy multi-select) */
  serviceTypes: string[];
  preferredDate: string;
  flexibleDate: string;
  location: string;
  sessionSetting: string;
  duration: string;
  /** Structured vision */
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
}

export const initialBookingData: BookingFormData = {
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  website: "",
  projectCategory: "",
  serviceTypes: [],
  preferredDate: "",
  flexibleDate: "",
  location: "",
  sessionSetting: "",
  duration: "",
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
};

export function formatInquiryId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Map category → serviceTypes for CMS enum compatibility. */
export function serviceTypesFromCategory(category: string, options: string[]): string[] {
  if (!category) return [];
  const match = options.find((o) => o.toLowerCase() === category.toLowerCase());
  if (match) return [match];
  // Fall back: keep category string — validation may use passthrough if in PROJECT_CATEGORIES
  return [category];
}

export function composeProjectVision(data: BookingFormData): string {
  const parts = [
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
