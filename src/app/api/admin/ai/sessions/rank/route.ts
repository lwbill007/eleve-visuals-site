import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getSavedRankingState,
  rerankSessionApplications,
  generateApplicationRankingSummary,
} from "@/lib/ai/intelligence/sessions";

export const maxDuration = 300;

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const volumeId = new URL(req.url).searchParams.get("volumeId") || undefined;
  const summary = new URL(req.url).searchParams.get("summary") === "1";

  const state = await getSavedRankingState(volumeId);
  if (summary && state.ranked.length > 0) {
    const text = await generateApplicationRankingSummary(volumeId);
    return NextResponse.json({ ...state, summary: text });
  }
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const volumeId = new URL(req.url).searchParams.get("volumeId") || undefined;
  try {
    const ranked = await rerankSessionApplications(volumeId);
    // Summary generation is deliberately last: it cannot run until the complete
    // cohort has been evaluated, persisted, and sorted.
    const summary = await generateApplicationRankingSummary(volumeId);
    return NextResponse.json({ ranked, summary });
  } catch (error) {
    console.error("Application re-rank failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI evaluation failed; previous rankings were preserved.",
      },
      { status: 503 }
    );
  }
}
