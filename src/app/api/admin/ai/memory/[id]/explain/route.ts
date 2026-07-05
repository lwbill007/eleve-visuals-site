import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { explainMemory } from "@/lib/ai/memory/knowledge";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const explanation = await explainMemory(id);
  if (!explanation) {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }

  return NextResponse.json(explanation);
}
