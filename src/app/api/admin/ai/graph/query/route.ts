import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { queryBusinessGraph } from "@/lib/ai/platform/graph-query";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:graph-query");
  if (blocked) return blocked;

  const body = (await req.json()) as { question?: string };
  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const result = await queryBusinessGraph(question);
  return NextResponse.json(result);
}
