import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { syncAllMemories } from "@/lib/ai/memory";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllMemories();
  return NextResponse.json({
    ok: true,
    synced: result.synced,
    layers: result.layers,
    learning: result.learning,
    message: `Synced ${result.synced} memories across ${result.layers.length} layers · ${result.learning.recorded} learning outcomes recorded.`,
  });
}
