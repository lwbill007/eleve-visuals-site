export const BOOKING_AUTOSAVE_KEY = "eleve-booking-draft";

export const BOOKING_STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Service" },
  { id: 3, label: "Session" },
  { id: 4, label: "Vision" },
  { id: 5, label: "Deliverables" },
  { id: 6, label: "Budget" },
  { id: 7, label: "Discovery" },
] as const;

export interface BookingFormData {
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  serviceTypes: string[];
  preferredDate: string;
  flexibleDate: string;
  location: string;
  sessionSetting: string;
  duration: string;
  projectVision: string;
  pinterestLink: string;
  moodBoardUrl: string;
  inspirationInstagram: string;
  driveLink: string;
  deliverables: string[];
  budgetRange: string;
  referralSource: string;
}

export const initialBookingData: BookingFormData = {
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  website: "",
  serviceTypes: [],
  preferredDate: "",
  flexibleDate: "",
  location: "",
  sessionSetting: "",
  duration: "",
  projectVision: "",
  pinterestLink: "",
  moodBoardUrl: "",
  inspirationInstagram: "",
  driveLink: "",
  deliverables: [],
  budgetRange: "",
  referralSource: "",
};

export function formatInquiryId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
