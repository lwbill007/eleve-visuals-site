import { NextResponse } from "next/server";
import { requireMinimumRole } from "@/lib/auth";
import { syncAllMemories } from "@/lib/ai/memory";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(request: Request) {
  try {
    await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin-ai:memory-sync");
  if (blocked) return blocked;

  const result = await syncAllMemories();
  return NextResponse.json({
    ok: true,
    synced: result.synced,
    layers: result.layers,
    learning: result.learning,
    message: `Synced ${result.synced} memories across ${result.layers.length} layers · ${result.learning.recorded} learning outcomes recorded.`,
  });
}
