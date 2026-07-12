import { z } from "zod";
import { EXPERIENCE_LEVELS, SESSIONS_APPLICANT_ROLES, type BookingOptions } from "./types";

const email = z.string().trim().email().max(254);
const phone = z
  .string()
  .max(30)
  .trim()
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Invalid phone number");

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date >= today;
  }, "Date must be today or in the future");

const optionalDateString = z
  .string()
  .trim()
  .max(20)
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date"
  )
  .refine((value) => {
    if (!value) return true;
    const date = new Date(`${value}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date >= today;
  }, "Date must be today or in the future");

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid URL");

function enumFromOptions(values: string[], label: string) {
  if (values.length === 0) {
    return z.string().trim().min(1, `Select a ${label}`);
  }
  return z.enum(values as [string, ...string[]], {
    errorMap: () => ({ message: `Select a valid ${label}` }),
  });
}

const optionalInstagram = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || /^@?[a-zA-Z0-9._]{1,30}$/.test(v) || /^https?:\/\/.+/i.test(v),
    "Enter a valid Instagram handle or URL"
  );

export function createBookingSchema(options: BookingOptions) {
  const categoryIds = [
    "Portrait",
    "Video",
    "Hybrid",
    "Event",
    "Business Branding",
    "Not Sure Yet",
    ...options.serviceTypes,
  ];

  return z.object({
    fullName: z.string().trim().min(1).max(120),
    email,
    phone,
    instagram: z
      .string()
      .max(31)
      .trim()
      .refine((v) => !v || /^@?[a-zA-Z0-9._]{1,30}$/.test(v), "Invalid Instagram handle"),
    website: optionalUrl,
    businessName: z.string().trim().max(160).optional().or(z.literal("")),
    packageId: z.string().trim().min(1, "Select an experience"),
    addOnIds: z.array(z.string()).max(30).optional().default([]),
    projectCategory: z
      .string()
      .trim()
      .min(1, "Select what we're creating")
      .refine((v) => categoryIds.some((c) => c.toLowerCase() === v.toLowerCase()), "Invalid category"),
    serviceTypes: z.array(z.string()).max(20).optional().default([]),
    preferredDate: dateString,
    flexibleDate: optionalDateString,
    location: z.string().trim().min(1).max(200),
    sessionSetting: enumFromOptions(options.sessionSettings, "session setting"),
    duration: enumFromOptions(options.durations, "duration"),
    feelingPrompt: z
      .string()
      .trim()
      .min(10, "Tell us what you want people to feel (at least 10 characters)")
      .max(2000),
    inspirationPrompt: z.string().trim().max(2000).optional().or(z.literal("")),
    purpose: z.string().trim().max(2000).optional().or(z.literal("")),
    goals: z.string().trim().max(2000).optional().or(z.literal("")),
    audience: z.string().trim().max(1000).optional().or(z.literal("")),
    creativeDirection: z.string().trim().max(2000).optional().or(z.literal("")),
    projectVision: z.string().trim().min(10, "Tell us the story (at least 10 characters)").max(5000),
    pinterestLink: optionalUrl,
    moodBoardUrl: optionalUrl,
    inspirationInstagram: optionalInstagram,
    driveLink: optionalUrl,
    deliverables: z
      .array(enumFromOptions(options.deliverables, "deliverable"))
      .min(1, "Select at least one deliverable")
      .max(20),
    budgetRange: enumFromOptions(options.budgetRanges, "budget range"),
    projectTimeline: z.string().trim().max(500).optional().or(z.literal("")),
    referralSource: enumFromOptions(options.referralSources, "referral source"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the booking terms" }),
    }),
    welcomeAccepted: z.boolean().optional(),
  });
}

export const bookingSchema = createBookingSchema({
  serviceTypes: [],
  sessionSettings: [],
  durations: [],
  budgetRanges: [],
  deliverables: [],
  referralSources: [],
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email,
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(10).max(5000),
});

export const sessionSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email,
  phone,
  instagram: z
    .string()
    .max(31)
    .trim()
    .refine(
      (v) => v.length >= 1 && /^@?[a-zA-Z0-9._]{1,30}$/.test(v),
      "Invalid Instagram handle"
    ),
  ageConfirm: z.literal(true),
  role: z.enum(SESSIONS_APPLICANT_ROLES as unknown as [string, ...string[]]),
  portfolioLink: z.string().trim().url().max(500),
  experienceLevel: z.enum(EXPERIENCE_LEVELS as unknown as [string, ...string[]]),
  whyParticipate: z.string().trim().min(10).max(3000),
  themeFit: z.string().trim().min(10).max(3000),
  availabilityConfirm: z.literal(true),
  mediaRelease: z.literal(true),
  sessionVolumeId: z.string().optional(),
  sessionVolumeSlug: z.string().optional(),
  sessionVolumeTitle: z.string().optional(),
});

export type BookingInput = z.infer<ReturnType<typeof createBookingSchema>>;
export type ContactInput = z.infer<typeof contactSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;