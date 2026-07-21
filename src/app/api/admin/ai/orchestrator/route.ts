import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { getLatestOrchestratorAudit, runOrchestrator } from "@/lib/ai/orchestrator";

const orchestratorSchema = z.object({
  taskKind: z.enum(["booking_submitted", "booking_review"]).default("booking_review"),
  submissionId: z.string().min(1).max(100),
  data: z.record(z.unknown()),
  email: z.string().email().max(320).optional(),
});

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const submissionId = searchParams.get("submissionId");
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  const audit = await getLatestOrchestratorAudit(submissionId);
  return NextResponse.json({ audit });
}

export async function POST(req: Request) {
  try {
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:orchestrator");
  if (blocked) return blocked;

  const parsed = orchestratorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid orchestrator payload" }, { status: 400 });
  }
  const body = parsed.data;

  const result = await runOrchestrator({
    taskKind: body.taskKind,
    submissionId: body.submissionId,
    data: body.data,
    email: body.email,
  });

  return NextResponse.json(result);
}
