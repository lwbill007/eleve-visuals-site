import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { reindexAllMemoryEmbeddings } from "@/lib/ai/memory/embeddings";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reindexAllMemoryEmbeddings(600);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[embeddings/reindex]", error);
    return NextResponse.json({ error: "Reindex failed" }, { status: 500 });
  }
}
