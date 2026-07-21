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

  // AI intelligence is optional: if evaluations cannot be loaded (e.g. the
  // evaluation table is missing or a query fails), report the failure instead
  // of 500ing so the applications list still renders.
  let state;
  try {
    state = await getSavedRankingState(volumeId);
  } catch (error) {
    console.error("Failed to load saved application rankings:", error);
    return NextResponse.json({
      ranked: [],
      applicationCount: 0,
      unevaluatedCount: 0,
      warning: "AI evaluations are unavailable. Applications are still accessible below.",
    });
  }
  if (summary && state.ranked.length > 0) {
    try {
      const text = await generateApplicationRankingSummary(volumeId);
      return NextResponse.json({ ...state, summary: text });
    } catch (error) {
      console.error("Failed to generate ranking summary:", error);
    }
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
    // Return persisted rankings immediately. The optional executive summary is
    // generated only by GET ?summary=1 so it cannot hold the evaluation UI open.
    return NextResponse.json({ ranked });
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
