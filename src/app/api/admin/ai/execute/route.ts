import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { executeRecommendation, type ExecuteKind } from "@/lib/ai/platform/execute";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin-ai:execute");
  if (blocked) return blocked;

  const body = (await request.json()) as {
    recommendationId?: string;
    title?: string;
    kind?: ExecuteKind;
    href?: string;
    submissionId?: string;
    evidence?: string[];
    confidence?: number;
    expectedRevenue?: number;
    expectedOutcome?: string;
  };

  if (!body.recommendationId) {
    return NextResponse.json({ error: "recommendationId required" }, { status: 400 });
  }

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
