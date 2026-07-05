import { getAdminDashboardOS, getAdminPipeline } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { getCached, setCache } from "../cache";
import type { BookingIntelligence } from "../types";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getBookingIntelligence(): Promise<BookingIntelligence> {
  const cached = await getCached<BookingIntelligence>("booking-intelligence");
  if (cached) return cached;

  const [dashboard, pipeline, bookings] = await Promise.all([
    getAdminDashboardOS(),
    getAdminPipeline(),
    prisma.submission.findMany({
      where: { type: "booking" },
      select: { id: true, status: true, data: true, createdAt: true, contactEmail: true, read: true },
    }),
  ]);

  const byMonth = new Map<string, number>();
  const now = new Date();
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
  const slowMonths = monthlyData.filter((m) => m.count < avg * 0.6 && m.count >= 0).map((m) => m.month);

  const abandoned = bookings.filter(
    (b) =>
      ["new", "contacted"].includes(b.status) &&
      !b.read &&
      b.createdAt.getTime() < Date.now() - 3 * 86400000
  );

  const completedEmails = new Set(
    bookings.filter((b) => b.status === "completed" && b.contactEmail).map((b) => b.contactEmail)
  );
  const allEmails = new Set(bookings.filter((b) => b.contactEmail).map((b) => b.contactEmail));
  const churnRate =
    allEmails.size > 0
      ? Math.round(((allEmails.size - completedEmails.size) / allEmails.size) * 100)
      : 0;

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

  const promotions: string[] = [];
  if (slowMonths.length > 0) {
    promotions.push(`Launch re-engagement campaign before ${slowMonths[0]}`);
  }
  if (abandoned.length > 3) {
    promotions.push(`${abandoned.length} abandoned inquiries — send recovery sequence`);
  }
  if (dashboard.metrics.returningClients < 5) {
    promotions.push("Referral incentive for completed clients");
  }

  const intel: BookingIntelligence = {
    generatedAt: new Date().toISOString(),
    monthlyTrend: monthlyData.map(({ month, count }) => ({ month, count })),
    busyMonths,
    slowMonths,
    revenueForecast,
    bookingForecast,
    churnRate,
    abandonedBookings: abandoned.slice(0, 10).map((b) => {
      let name = b.contactEmail;
      try {
        const d = JSON.parse(b.data) as Record<string, unknown>;
        name = String(d.fullName || d.name || b.contactEmail);
      } catch {
        /* ignore */
      }
      return {
        id: b.id ?? b.contactEmail,
        name,
        email: b.contactEmail,
        daysSince: Math.round((Date.now() - b.createdAt.getTime()) / 86400000),
        href: `/admin/submissions?type=booking`,
      };
    }),
    pricingRecommendations,
    promotions,
    pipelineValue: pipeline.totalValue,
    conversionTrend: dashboard.metrics.monthlyGrowth,
  };

  await setCache("booking-intelligence", intel, 30 * 60 * 1000);
  return intel;
}
