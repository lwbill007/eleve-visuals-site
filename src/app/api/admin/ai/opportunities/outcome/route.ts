import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { recordLearningOutcome } from "@/lib/ai/memory/learning";
import { invalidateCache } from "@/lib/ai/cache";
import { prisma } from "@/lib/db";
import {
  canTransitionOpportunity,
  type OpportunityStatus,
} from "@/lib/admin-operations";

const bodySchema = z.object({
  recommendationId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["accepted", "completed", "rejected"]),
  result: z.string().optional(),
  predictionCorrect: z.boolean().nullable().optional(),
  confidenceDelta: z.number().nullable().optional(),
  revenueImpact: z.number().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outcome payload" }, { status: 400 });
  }

  const body = parsed.data;
  const latest = await prisma.aILearningOutcome.findFirst({
    where: {
      domain: "opportunities",
      actionRef: body.recommendationId,
      actionType: { startsWith: "recommendation_" },
    },
    orderBy: { createdAt: "desc" },
    select: { actionType: true },
  });
  const storedStatus = latest?.actionType.replace("recommendation_", "");
  const current: OpportunityStatus =
    storedStatus === "accepted" || storedStatus === "completed" || storedStatus === "rejected"
      ? storedStatus
      : "pending";
  if (!canTransitionOpportunity(current, body.status)) {
    return NextResponse.json(
      { error: `Cannot move opportunity from ${current} to ${body.status}.` },
      { status: 409 }
    );
  }

  const outcome =
    body.status === "rejected"
      ? "negative"
      : body.predictionCorrect === false
        ? "negative"
        : body.predictionCorrect === true
          ? "positive"
          : "neutral";

  const row = await recordLearningOutcome({
    domain: "opportunities",
    actionType: `recommendation_${body.status}`,
    actionRef: body.recommendationId,
    hypothesis: `${body.title}${body.result ? ` — ${body.result}` : ""}`,
    outcome,
    outcomeEvidence: true,
    metrics: {
      predictionCorrect: body.predictionCorrect ?? null,
      confidenceDelta: body.confidenceDelta ?? null,
      learningStatus: body.status,
      result: body.result ?? null,
    },
    revenueImpact: body.revenueImpact ?? undefined,
    confidence: body.status === "completed" ? 0.7 : 0.5,
  });

  await invalidateCache("executive-context").catch(() => {});
  await invalidateCache("command-home").catch(() => {});
  await invalidateCache("daily-briefing").catch(() => {});

  return NextResponse.json({
    ok: true,
    outcomeId: row?.id ?? null,
    status: body.status,
  });
}
