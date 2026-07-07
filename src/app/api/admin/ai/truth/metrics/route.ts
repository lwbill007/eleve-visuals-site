import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resolveMetrics } from "@/lib/ai/platform/truth-resolver";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolved = await resolveMetrics();
    return NextResponse.json(resolved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve metrics" },
      { status: 500 }
    );
  }
}
