import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getConversionDashboard } from "@/lib/analytics-funnel";
import { getExecutiveAnalytics } from "@/lib/executive-analytics";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));

  const [analytics, conversion, executive] = await Promise.all([
    getAnalyticsSummary(days),
    getConversionDashboard(days),
    getExecutiveAnalytics(days),
  ]);

  return NextResponse.json({ ...analytics, conversion, executive });
}
