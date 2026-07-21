import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { completeMission } from "@/lib/ai/executive/mission-control";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

const missionSchema = z.object({
  missionId: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  worked: z.boolean(),
  revenueImpact: z.number().finite().min(-100_000_000).max(100_000_000).optional(),
  bookingsImpact: z.number().int().min(-100_000).max(100_000).optional(),
  notes: z.string().max(5000).optional(),
});

export async function POST(req: Request) {
  try {
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:mission-complete");
  if (blocked) return blocked;

  const parsed = missionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mission payload" }, { status: 400 });
  }
  const body = parsed.data;

  const result = await completeMission(body);
  const { emitBusinessEvent } = await import("@/lib/ai/platform/business-events");
  await emitBusinessEvent({
    type: "mission_completed",
    entityId: body.missionId,
    entityType: "mission",
    payload: {
      worked: body.worked,
      revenueImpact: body.revenueImpact,
      bookingsImpact: body.bookingsImpact,
    },
    actor: "admin",
    source: "command_center",
  });
  await invalidateIntelligenceCaches();
  return NextResponse.json(result);
}
