import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getLatestOrchestratorAudit, runOrchestrator } from "@/lib/ai/orchestrator";

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
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    taskKind?: "booking_submitted" | "booking_review";
    submissionId?: string;
    data?: Record<string, unknown>;
    email?: string;
  };

  if (!body.submissionId || !body.data) {
    return NextResponse.json({ error: "submissionId and data required" }, { status: 400 });
  }

  const result = await runOrchestrator({
    taskKind: body.taskKind || "booking_review",
    submissionId: body.submissionId,
    data: body.data,
    email: body.email,
  });

  return NextResponse.json(result);
}
