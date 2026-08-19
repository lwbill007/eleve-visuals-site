import { NextResponse } from "next/server";
import { refreshIntelligence, shouldRunScheduledRefresh } from "@/lib/ai/memory/knowledge";
import { prisma } from "@/lib/db";
import { fetchGA4DailyMetrics, isGA4Configured } from "@/lib/ga4-client";

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

  const { buildBusinessDNA } = await import("@/lib/ai/cognitive/business-dna");
  const { invalidateIntelligenceCaches } = await import("@/lib/ai/cognitive/cache");
  const { runExecutiveQA } = await import("@/lib/ai/truth/executive-qa");
  const { runAllSystemAutomations } = await import("@/lib/ai/intelligence/system-automations");
  const [dnaAndCache, qaReport, automationResults] = await Promise.all([
    Promise.all([buildBusinessDNA(), invalidateIntelligenceCaches()]),
    runExecutiveQA().catch(() => null),
    runAllSystemAutomations().catch(() => []),
  ]);
  void dnaAndCache;

  if (schedule === "weekly") {
    const { generateWeeklyExecutiveReport } = await import("@/lib/ai/intelligence/weekly-executive-report");
    await generateWeeklyExecutiveReport({ persist: true }).catch(() => {});
  }

  let ga4Synced = false;
  if (schedule === "daily" && isGA4Configured()) {
    try {
      const daily = await fetchGA4DailyMetrics(1);
      await prisma.gA4Snapshot.upsert({
        where: { date: daily.date },
        create: daily,
        update: {
          sessions: daily.sessions,
          activeUsers: daily.activeUsers,
          conversions: daily.conversions,
          fetchedAt: new Date(),
        },
      });
      ga4Synced = true;
    } catch {
      // GA4 is additive — a fetch failure should never break the rest of the daily refresh.
    }
  }

  return NextResponse.json({
    ok: true,
    refreshId: report.refreshId,
    pagesScanned: report.pagesScanned,
    ga4Synced,
    healthScore: report.executiveReport.overallHealthScore,
    qaScore: qaReport?.overallScore,
    qaIssues: qaReport?.issues?.length ?? 0,
    automations: Array.isArray(automationResults)
      ? {
          ran: automationResults.length,
          notificationsCreated: automationResults.reduce(
            (s, r) => s + (r.createdNotifications ?? 0),
            0
          ),
        }
      : null,
  });
}
