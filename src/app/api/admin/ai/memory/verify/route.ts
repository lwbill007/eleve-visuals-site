import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getVerificationQueue,
  getVerificationStats,
  setVerificationStatus,
  runAutoVerification,
} from "@/lib/ai/memory/verification";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

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
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action?: "batch" | "auto";
    memoryIds?: string[];
    status?: "verified" | "trusted" | "archived" | "pending";
  };

  if (body.action === "auto") {
    const result = await runAutoVerification();
    await invalidateIntelligenceCaches();
    const stats = await getVerificationStats();
    return NextResponse.json({ ok: true, ...result, stats });
  }

  if (!body.memoryIds?.length || !body.status) {
    return NextResponse.json({ error: "memoryIds and status required" }, { status: 400 });
  }

  const count = await setVerificationStatus(body.memoryIds, body.status, "admin", "Batch verification");
  await invalidateIntelligenceCaches();
  const stats = await getVerificationStats();
  return NextResponse.json({ ok: true, count, stats });
}
