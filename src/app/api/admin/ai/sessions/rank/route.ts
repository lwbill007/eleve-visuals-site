import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  rankSessionApplications,
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

  const ranked = await rankSessionApplications(volumeId);
  if (summary) {
    const text = await generateApplicationRankingSummary(volumeId);
    return NextResponse.json({ ranked, summary: text });
  }
  return NextResponse.json({ ranked });
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
