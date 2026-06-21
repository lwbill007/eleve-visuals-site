import { prisma } from "./db";

export type ConversionType = "booking" | "contact" | "session";

interface PageViewInput {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  sessionId?: string | null;
}

export async function recordPageView(input: PageViewInput) {
  await prisma.analyticsEvent.create({
    data: {
      type: "pageview",
      path: input.path.slice(0, 500),
      referrer: input.referrer?.slice(0, 500) ?? null,
      utmSource: input.utmSource?.slice(0, 200) ?? null,
      utmMedium: input.utmMedium?.slice(0, 200) ?? null,
      utmCampaign: input.utmCampaign?.slice(0, 200) ?? null,
      sessionId: input.sessionId?.slice(0, 64) ?? null,
    },
  });
}

export async function recordConversion(
  conversionType: ConversionType,
  path: string,
  referrer?: string | null,
  sessionId?: string | null
) {
  await prisma.analyticsEvent.create({
    data: {
      type: "conversion",
      path: path.slice(0, 500),
      referrer: referrer?.slice(0, 500) ?? null,
      conversionType,
      sessionId: sessionId?.slice(0, 64) ?? null,
    },
  });
}

function sinceDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function parseReferrerSource(referrer: string | null): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("tiktok")) return "TikTok";
    return host;
  } catch {
    return "Other";
  }
}

export async function getAnalyticsSummary(days = 30) {
  const since = sinceDays(days);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      type: true,
      path: true,
      referrer: true,
      utmSource: true,
      conversionType: true,
      sessionId: true,
    },
  });

  const pageviews = events.filter((e) => e.type === "pageview");
  const conversions = events.filter((e) => e.type === "conversion");

  const pageCounts = new Map<string, number>();
  for (const pv of pageviews) {
    pageCounts.set(pv.path, (pageCounts.get(pv.path) ?? 0) + 1);
  }

  const sourceCounts = new Map<string, number>();
  for (const pv of pageviews) {
    const source = pv.utmSource || parseReferrerSource(pv.referrer);
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const conversionCounts = {
    booking: conversions.filter((c) => c.conversionType === "booking").length,
    contact: conversions.filter((c) => c.conversionType === "contact").length,
    session: conversions.filter((c) => c.conversionType === "session").length,
  };

  const conversionPaths = new Map<string, number>();
  for (const c of conversions) {
    conversionPaths.set(c.path, (conversionPaths.get(c.path) ?? 0) + 1);
  }

  const uniqueSessions = new Set(
    pageviews.map((p) => p.sessionId).filter(Boolean)
  ).size;

  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));

  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, visits]) => ({ source, visits }));

  const inquiryPages = ["/book", "/contact", "/sessions/apply"];
  const inquiryViews = pageviews.filter((p) => inquiryPages.includes(p.path)).length;
  const totalConversions =
    conversionCounts.booking + conversionCounts.contact + conversionCounts.session;

  return {
    periodDays: days,
    totals: {
      pageviews: pageviews.length,
      uniqueSessions,
      conversions: totalConversions,
      conversionRate:
        inquiryViews > 0 ? Math.round((totalConversions / inquiryViews) * 1000) / 10 : 0,
    },
    conversions: conversionCounts,
    topPages,
    topSources,
    conversionByPage: [...conversionPaths.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([path, count]) => ({ path, count })),
  };
}
