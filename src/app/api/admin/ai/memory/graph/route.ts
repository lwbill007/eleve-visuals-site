import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMemoryGraph } from "@/lib/ai/memory/graph";
import type { MemoryLayer } from "@/lib/ai/memory/types";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const layer = new URL(req.url).searchParams.get("layer") as MemoryLayer | null;
  const graph = await getMemoryGraph({ layer: layer ?? undefined, limit: 80 });
  return NextResponse.json(graph);
}
