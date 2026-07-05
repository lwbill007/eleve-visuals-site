import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getExecutiveOS } from "@/lib/ai/executive";
import { recordRecommendationFeedback } from "@/lib/ai/executive/self-improvement";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const os = await getExecutiveOS(force);
  return NextResponse.json(os);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, recommendationId, title, worked, detail, revenueImpact } = body as {
    action?: string;
    recommendationId?: string;
    title?: string;
    worked?: boolean;
    detail?: string;
    revenueImpact?: number;
  };

  if (action === "feedback" && recommendationId && title) {
    const lesson = await recordRecommendationFeedback({
      recommendationId,
      title,
      worked: Boolean(worked),
      detail: detail ?? "",
      revenueImpact,
    });
    return NextResponse.json({ ok: true, lesson });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
