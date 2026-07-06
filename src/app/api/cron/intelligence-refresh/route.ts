import { NextResponse } from "next/server";
import { refreshIntelligence, shouldRunScheduledRefresh } from "@/lib/ai/memory/knowledge";

/**
 * Scheduled intelligence refresh. Triggered by Vercel Cron (nightly + weekly).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const schedule = (url.searchParams.get("schedule") ?? "daily") as "daily" | "weekly";

  const shouldRun = await shouldRunScheduledRefresh(schedule);
  if (!shouldRun) {
    return NextResponse.json({ ok: true, skipped: true, reason: `${schedule} schedule not enabled` });
  }

  const report = await refreshIntelligence(schedule);

  if (schedule === "weekly") {
    const { generateWeeklyExecutiveReport } = await import("@/lib/ai/intelligence/weekly-executive-report");
    await generateWeeklyExecutiveReport({ persist: true }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    refreshId: report.refreshId,
    pagesScanned: report.pagesScanned,
    healthScore: report.executiveReport.overallHealthScore,
  });
}
