import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import {
  getVerificationQueue,
  getVerificationStats,
  setVerificationStatus,
  runAutoVerification,
} from "@/lib/ai/memory/verification";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

const verificationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("auto") }),
  z.object({
    action: z.literal("batch"),
    memoryIds: z.array(z.string().min(1).max(100)).min(1).max(200),
    status: z.enum(["verified", "trusted", "archived", "pending"]),
  }),
]);

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, queue] = await Promise.all([getVerificationStats(), getVerificationQueue(40)]);
  return NextResponse.json({ stats, queue });
}

export async function POST(req: Request) {
  try {
    await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:memory-verify");
  if (blocked) return blocked;

  const parsed = verificationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification payload" }, { status: 400 });
  }
  const body = parsed.data;

  if (body.action === "auto") {
    const result = await runAutoVerification();
    await invalidateIntelligenceCaches();
    const stats = await getVerificationStats();
    return NextResponse.json({ ok: true, ...result, stats });
  }

  const count = await setVerificationStatus(body.memoryIds, body.status, "admin", "Batch verification");
  await invalidateIntelligenceCaches();
  const stats = await getVerificationStats();
  return NextResponse.json({ ok: true, count, stats });
}
