import { getAdminDashboardOS, getAdminPipeline } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { getCached, setCache } from "../cache";
import type { BookingIntelligence } from "../types";

const CACHE_KEY = "booking-intelligence-v3";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseName(data: string, fallback: string): string {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    return String(parsed.fullName || parsed.name || fallback);
  } catch {
    return fallback;
  }
}

function isValidBookingIntelligence(value: unknown): value is BookingIntelligence {
  if (!value || typeof value !== "object") return false;
  const intel = value as BookingIntelligence;
  return (
    typeof intel.generatedAt === "string" &&
    typeof intel.pipelineValue === "number" &&
    typeof intel.staleInquiries === "number" &&
    typeof intel.monthBookings === "number" &&
    Array.isArray(intel.monthlyTrend) &&
    Array.isArray(intel.abandonedBookings)
  );
}

export async function getBookingIntelligence(force = false): Promise<BookingIntelligence> {
  if (!force) {
    const cached = await getCached<BookingIntelligence>(CACHE_KEY);
    if (cached && isValidBookingIntelligence(cached)) return cached;
  }

  const [dashboard, pipeline, bookings] = await Promise.all([
    getAdminDashboardOS(),
    getAdminPipeline(),
    prisma.submission.findMany({
      where: { type: "booking" },
      select: {
        id: true,
        status: true,
        data: true,
        createdAt: true,
        updatedAt: true,
        contactEmail: true,
      },
    }),
  ]);

  const byMonth = new Map<string, number>();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const staleCutoff = Date.now() - 3 * 86400000;

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(monthKey(d), 0);
  }
  for (const b of bookings) {
    const key = monthKey(b.createdAt);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }

  const monthlyData = [...byMonth.entries()].map(([key, count]) => {
    const [y, m] = key.split("-");
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short" });
    return { month: label, count, key };
  });

  const avg = monthlyData.reduce((s, m) => s + m.count, 0) / Math.max(monthlyData.length, 1);
  const busyMonths = monthlyData.filter((m) => m.count > avg * 1.2).map((m) => m.month);
  const slowMonths = monthlyData.filter((m) => m.count < avg * 0.6).map((m) => m.month);

  const pending = bookings.filter((b) => ["new", "contacted"].includes(b.status));
  const stale = pending.filter((b) => b.updatedAt.getTime() < staleCutoff);

  const monthBookings = bookings.filter((b) => b.createdAt >= monthStart).length;

  const recentAvg = monthlyData.slice(-3).reduce((s, m) => s + m.count, 0) / 3;
  const revenueForecast = Math.round(recentAvg * 1750 * 3);
  const bookingForecast = Math.round(recentAvg * 3);

  const pricingRecommendations: string[] = [];
  if (dashboard.metrics.monthlyGrowth < 0) {
    pricingRecommendations.push("Consider a limited-time portrait package promotion for slow season");
  }
  if (busyMonths.length > 0) {
    pricingRecommendations.push(`Raise availability pricing during peak months: ${busyMonths.join(", ")}`);
  }
  if (pipeline.totalValue < 5000) {
    pricingRecommendations.push("Bundle BTS content + prints to increase average booking value");
  }
  if (pricingRecommendations.length === 0) {
    pricingRecommendations.push("Hold premium pricing — pipeline value supports current positioning");
  }

  const promotions: string[] = [];
  if (slowMonths.length > 0) {
    promotions.push(`Launch re-engagement campaign before ${slowMonths[0]}`);
  }
  if (stale.length > 0) {
    promotions.push(`${stale.length} stale inquiries — send recovery sequence within 24 hours`);
  }
  if (dashboard.metrics.returningClients < 5) {
    promotions.push("Referral incentive for completed clients");
  }
  if (promotions.length === 0) {
    promotions.push("Feature top portfolio work on Instagram to maintain inquiry flow");
  }

  const intel: BookingIntelligence = {
    generatedAt: new Date().toISOString(),
    monthlyTrend: monthlyData.map(({ month, count }) => ({ month, count })),
    busyMonths,
    slowMonths,
    revenueForecast,
    bookingForecast,
    pendingInquiries: pending.length,
    staleInquiries: stale.length,
    monthBookings,
    monthGrowth: dashboard.metrics.monthlyGrowth,
    abandonedBookings: stale.slice(0, 12).map((b) => ({
      id: b.id,
      name: parseName(b.data, b.contactEmail || "Unknown"),
      email: b.contactEmail,
      daysSince: Math.round((Date.now() - b.updatedAt.getTime()) / 86400000),
      href: `/admin/submissions?type=booking&focus=${b.id}`,
      status: b.status,
    })),
    pricingRecommendations,
    promotions,
    pipelineValue: pipeline.totalValue,
    conversionTrend: dashboard.metrics.conversionRate,
  };

  await setCache(CACHE_KEY, intel, 15 * 60 * 1000);
  return intel;
}
