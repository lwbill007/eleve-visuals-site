import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAIHealthSnapshot } from "@/lib/ai/health";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getAIHealthSnapshot());
  } catch (error) {
    return NextResponse.json(
      {
        error: "AI health unavailable",
        detail: error instanceof Error ? error.message : "Unknown health-check failure",
      },
      { status: 503 }
    );
  }
}
