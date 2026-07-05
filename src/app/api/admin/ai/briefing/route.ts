import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAIDailyBriefing } from "@/lib/ai/intelligence/daily-briefing";
import type { AIBriefing } from "@/lib/ai/types";

/** Legacy endpoint — maps daily briefing to AIBriefing shape for backward compatibility. */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const daily = await getAIDailyBriefing(force);

  const briefing: AIBriefing = {
    generatedAt: daily.generatedAt,
    provider: daily.provider,
    summary: daily.summary,
    priorities: daily.weeklyPriorities,
    opportunities: daily.recommendedActions.map((a) => ({
      title: a.title,
      detail: a.detail,
      action: a.action,
      href: a.href,
    })),
    scores: {
      businessHealth: daily.scores.businessHealth,
      marketing: daily.scores.marketing,
      sales: daily.scores.sales,
      productivity: daily.scores.productivity,
    },
    forecast: `Bookings: ${daily.forecast.bookings}. Pipeline: ~$${daily.forecast.revenue.toLocaleString()}.`,
  };

  return NextResponse.json(briefing);
}
