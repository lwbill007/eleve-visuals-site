import { z } from "zod";
import { EXPERIENCE_LEVELS, SESSIONS_APPLICANT_ROLES } from "./types";

const email = z.string().trim().email().max(254);
const phone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Invalid phone number");

export const bookingSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email,
  phone,
  instagram: z
    .string()
    .trim()
    .max(31)
    .refine((v) => !v || /^@?[a-zA-Z0-9._]{1,30}$/.test(v), "Invalid Instagram handle"),
  serviceType: z.string().trim().min(1).max(80),
  shootType: z.string().trim().min(1).max(80),
  preferredDate: z.string().trim().min(1).max(20),
  alternateDate: z.string().trim().max(20).optional().or(z.literal("")),
  location: z.string().trim().min(1).max(200),
  budgetRange: z.string().trim().min(1).max(80),
  projectDetails: z.string().trim().min(10).max(5000),
  deliverables: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  depositAck: z.literal(true),
  termsAck: z.literal(true),
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
    .trim()
    .min(1)
    .max(31)
    .refine((v) => /^@?[a-zA-Z0-9._]{1,30}$/.test(v), "Invalid Instagram handle"),
  ageConfirm: z.literal(true),
  role: z.enum(SESSIONS_APPLICANT_ROLES as unknown as [string, ...string[]]),
  portfolioLink: z.string().trim().url().max(500),
  experienceLevel: z.enum(EXPERIENCE_LEVELS as unknown as [string, ...string[]]),
  whyParticipate: z.string().trim().min(10).max(3000),
  themeFit: z.string().trim().min(10).max(3000),
  availabilityConfirm: z.literal(true),
  mediaRelease: z.literal(true),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
