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
    serviceTypes: z
      .array(enumFromOptions(options.serviceTypes, "service"))
      .min(1, "Select at least one service")
      .max(20),
    preferredDate: dateString,
    flexibleDate: optionalDateString,
    location: z.string().trim().min(1).max(200),
    sessionSetting: enumFromOptions(options.sessionSettings, "session setting"),
    duration: enumFromOptions(options.durations, "duration"),
    projectVision: z.string().trim().min(10).max(5000),
    pinterestLink: optionalUrl,
    moodBoardUrl: optionalUrl,
    inspirationInstagram: optionalInstagram,
    driveLink: optionalUrl,
    deliverables: z
      .array(enumFromOptions(options.deliverables, "deliverable"))
      .min(1, "Select at least one deliverable")
      .max(20),
    budgetRange: enumFromOptions(options.budgetRanges, "budget range"),
    referralSource: enumFromOptions(options.referralSources, "referral source"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the booking terms" }),
    }),
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