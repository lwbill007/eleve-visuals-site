import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getMemoryStats,
  getMemoryTimeline,
  searchMemories,
  writeMemory,
  type MemoryLayer,
  type MemoryWriteInput,
} from "@/lib/ai/memory";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const layer = url.searchParams.get("layer") as MemoryLayer | null;
  const query = url.searchParams.get("q") ?? undefined;
  const archived = url.searchParams.get("archived") === "1";
  const pinned = url.searchParams.get("pinned") === "1" ? true : undefined;
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const view = url.searchParams.get("view");

  if (view === "stats") {
    const stats = await getMemoryStats();
    return NextResponse.json(stats);
  }

  if (view === "heatmap") {
    const { getMemoryHeatmap } = await import("@/lib/ai/memory/store");
    const heatmap = await getMemoryHeatmap();
    return NextResponse.json(heatmap);
  }

  if (view === "timeline") {
    const timeline = await getMemoryTimeline(limit);
    return NextResponse.json({ items: timeline });
  }

  const result = await searchMemories({
    layer: layer ?? undefined,
    query,
    archived,
    pinned,
    limit,
    offset,
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guardMutatingAdminAi } = await import("@/lib/admin-request-guard");
  const blocked = await guardMutatingAdminAi(req, "admin-ai:memory-write");
  if (blocked) return blocked;

  const body = (await req.json()) as Partial<MemoryWriteInput>;
  if (!body.layer || !body.category || !body.key || !body.value) {
    return NextResponse.json({ error: "layer, category, key, and value are required" }, { status: 400 });
  }

  const record = await writeMemory({
    ...body,
    layer: body.layer,
    category: body.category,
    key: body.key,
    value: body.value,
    source: body.source ?? "user",
    actor: "admin",
  });

  return NextResponse.json(record);
}
