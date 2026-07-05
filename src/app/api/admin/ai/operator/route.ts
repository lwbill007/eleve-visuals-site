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

  const [metrics, insights, marketing, sales, sessions, improvements] = await Promise.all([
    getOperatorMetrics(),
    getProactiveBusinessInsights(),
    getMarketingRecommendations(),
    getSalesRecommendations(),
    getSessionsOperatorIntel(),
    getSelfImprovementRecommendations(),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    metrics,
    insights,
    marketing,
    sales,
    sessions,
    improvements,
  });
}
