import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { executeRecommendation } from "@/lib/ai/platform/execute";

const executeSchema = z.object({
  recommendationId: z.string().min(1).max(200),
  title: z.string().max(500).optional(),
  kind: z
    .enum([
      "navigate",
      "mark_booking_contacted",
      "mark_stale_bookings_contacted",
      "complete_mission",
      "open_pipeline",
      "open_applications",
      "open_memory_verify",
      "open_payments_trust",
    ])
    .optional(),
  href: z.string().max(1000).optional(),
  submissionId: z.string().max(100).optional(),
  evidence: z.array(z.string().max(1000)).max(50).optional(),
  confidence: z.number().min(0).max(1).optional(),
  expectedRevenue: z.number().finite().min(0).max(100_000_000).optional(),
  expectedOutcome: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin-ai:execute");
  if (blocked) return blocked;

  const parsed = executeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid execution payload" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const result = await executeRecommendation({
      recommendationId: body.recommendationId,
      title: body.title,
      kind: body.kind,
      href: body.href,
      submissionId: body.submissionId,
      evidence: body.evidence,
      confidence: body.confidence,
      expectedRevenue: body.expectedRevenue,
      expectedOutcome: body.expectedOutcome,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[execute]", err);
    return NextResponse.json({ error: "Execute failed" }, { status: 500 });
  }
}
