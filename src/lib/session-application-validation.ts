import { z } from "zod";
import { SESSION_APPLICATION_ROLES } from "./types";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL");

const instagram = z
  .string()
  .max(31)
  .trim()
  .refine((v) => v.length >= 1 && /^@?[a-zA-Z0-9._]{1,30}$/.test(v), "Invalid Instagram handle");

const email = z.string().trim().email().max(200);
const phone = z
  .string()
  .trim()
  .min(10)
  .max(30)
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number");

export const sessionApplicationSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email,
  phone,
  cityState: z.string().trim().min(2).max(120),
  instagram,
  portfolioWebsite: optionalUrl,
  roles: z.array(z.enum(SESSION_APPLICATION_ROLES as unknown as [string, ...string[]])).min(1),
  experience: z.string().trim().max(500).optional(),
  portfolioImages: z.array(z.string().url()).max(5).default([]),
  portfolioLink: optionalUrl,
  demoReel: optionalUrl,
  youtube: optionalUrl,
  vimeo: optionalUrl,
  behance: optionalUrl,
  driveLink: optionalUrl,
  questionAnswers: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string().max(3000),
      })
    )
    .min(1),
  availabilityConfirm: z.literal(true),
  transportationConfirm: z.literal(true),
  creativeDirectionConfirm: z.literal(true),
  emergencyContact: z.string().trim().max(200).optional(),
  agreementCurated: z.literal(true),
  agreementNoGuarantee: z.literal(true),
  agreementGuidelines: z.literal(true),
  agreementAccurate: z.literal(true),
  sessionVolumeId: z.string().min(1),
  sessionVolumeSlug: z.string().optional(),
  sessionVolumeTitle: z.string().optional(),
});

export type SessionApplicationInput = z.infer<typeof sessionApplicationSchema>;

export function createSessionApplicationSchema(options: {
  requirePortfolioUpload: boolean;
  questions: { id: string; required: boolean; maxLength: number }[];
}) {
  return sessionApplicationSchema.superRefine((data, ctx) => {
    const hasPortfolio =
      data.portfolioImages.length > 0 ||
      !!data.portfolioLink?.trim() ||
      !!data.portfolioWebsite?.trim();

    if (options.requirePortfolioUpload && data.portfolioImages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upload at least one portfolio image",
        path: ["portfolioImages"],
      });
    } else if (!hasPortfolio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide portfolio images or a portfolio URL",
        path: ["portfolioLink"],
      });
    }

    for (const q of options.questions) {
      if (!q.required) continue;
      const answer = data.questionAnswers.find((a) => a.id === q.id)?.answer?.trim() ?? "";
      if (answer.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide at least 10 characters",
          path: ["questionAnswers"],
        });
      }
    }
  });
}
