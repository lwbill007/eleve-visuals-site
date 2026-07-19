import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAIHealthSnapshot } from "@/lib/ai/health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getAIHealthSnapshot());
  } catch (error) {
    console.error("AI health snapshot failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI health data is temporarily unavailable.",
      },
      { status: 503 }
    );
  }
}
