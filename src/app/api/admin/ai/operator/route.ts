import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getCommandCenterHub,
  getMarketingRecommendations,
  getOperatorMetrics,
  getProactiveBusinessInsights,
  getSalesRecommendations,
  getSelfImprovementRecommendations,
  getSessionsOperatorIntel,
} from "@/lib/ai/intelligence/business-operator";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const hub = searchParams.get("hub");

  if (hub) {
    const center = await getCommandCenterHub(hub);
    return NextResponse.json(center ?? { error: "Unknown hub" }, { status: center ? 200 : 404 });
  }

  try {
    const [metricsResult, insightsResult, marketingResult, salesResult, sessionsResult, improvementsResult] =
      await Promise.allSettled([
        getOperatorMetrics(),
        getProactiveBusinessInsights(),
        getMarketingRecommendations(),
        getSalesRecommendations(),
        getSessionsOperatorIntel(),
        getSelfImprovementRecommendations(),
      ]);

    const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : null;
    const insights = insightsResult.status === "fulfilled" ? insightsResult.value : [];
    const marketing = marketingResult.status === "fulfilled" ? marketingResult.value : [];
    const sales = salesResult.status === "fulfilled" ? salesResult.value : [];
    const sessions = sessionsResult.status === "fulfilled" ? sessionsResult.value : null;
    const improvements = improvementsResult.status === "fulfilled" ? improvementsResult.value : [];

    if (!metrics && !sessions) {
      console.error("[operator]", {
        metrics: metricsResult.status === "rejected" ? metricsResult.reason : null,
        sessions: sessionsResult.status === "rejected" ? sessionsResult.reason : null,
      });
      return NextResponse.json({ error: "Failed to load operator data" }, { status: 500 });
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      metrics,
      insights,
      marketing,
      sales,
      sessions,
      improvements,
    });
  } catch (error) {
    console.error("[operator]", error);
    return NextResponse.json({ error: "Failed to load operator data" }, { status: 500 });
  }
}
