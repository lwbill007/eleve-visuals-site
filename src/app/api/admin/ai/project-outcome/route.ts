import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { recordProjectOutcome } from "@/lib/ai/learning/project-feedback";

const outcomeSchema = z.object({
  submissionId: z.string().min(1).max(100),
  clientEmail: z.string().email().max(320).optional(),
  booked: z.boolean(),
  finalRevenue: z.number().finite().min(0).max(100_000_000).optional(),
  profit: z.number().finite().min(-100_000_000).max(100_000_000).optional(),
  clientRating: z.number().min(0).max(5).optional(),
  deliveryDays: z.number().int().min(0).max(3650).optional(),
  portfolioFeatured: z.boolean().default(false),
  notes: z.string().max(5000).optional(),
});

export async function POST(req: Request) {
  try {
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:project-outcome");
  if (blocked) return blocked;

  const parsed = outcomeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project outcome payload" }, { status: 400 });
  }
  const body = parsed.data;

  const result = await recordProjectOutcome({
    submissionId: body.submissionId,
    clientEmail: body.clientEmail,
    booked: body.booked,
    finalRevenue: body.finalRevenue,
    profit: body.profit,
    clientRating: body.clientRating,
    deliveryDays: body.deliveryDays,
    portfolioFeatured: body.portfolioFeatured,
    notes: body.notes,
  });

  return NextResponse.json(result);
}
