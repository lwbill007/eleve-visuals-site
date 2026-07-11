import { prisma } from "@/lib/db";
import { isClosedWonStatus, isOpenInquiryStatus, normalizeInquiryStatus } from "@/lib/booking-pipeline";
import { estimateBudgetValue } from "@/lib/estimate-budget";
import type { ExtendedBookingIntelligence, BookingSourceMetric, BookingServiceMetric, LostInquiry } from "../types";

function parseService(data: string): string {
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    const types = d.serviceTypes as string[] | undefined;
    return types?.[0] || (d.serviceType as string) || "Portrait";
  } catch {
    return "Portrait";
  }
}

function parseReferral(data: string): string {
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    return (d.referralSource as string) || "Direct";
  } catch {
    return "Direct";
  }
}

export async function getExtendedBookingIntelligence(days = 90): Promise<ExtendedBookingIntelligence> {
  const since = new Date(Date.now() - days * 86400000);
  const bookings = await prisma.submission.findMany({
    where: { type: "booking", createdAt: { gte: since } },
    select: { id: true, status: true, data: true, createdAt: true, updatedAt: true, contactEmail: true },
  });

  const responseTimes: number[] = [];
  const inquiryToBooking: number[] = [];
  const sourceMap = new Map<string, { inquiries: number; booked: number; revenue: number }>();
  const serviceMap = new Map<string, { inquiries: number; booked: number; value: number }>();

  for (const b of bookings) {
    const service = parseService(b.data);
    const source = parseReferral(b.data);
    const value = estimateBudgetValue(
      (() => {
        try {
          return String((JSON.parse(b.data) as Record<string, unknown>).budgetRange ?? "");
        } catch {
          return "";
        }
      })()
    );

    const src = sourceMap.get(source) ?? { inquiries: 0, booked: 0, revenue: 0 };
    src.inquiries += 1;
    if (isClosedWonStatus(b.status) || normalizeInquiryStatus(b.status) === "booked") {
      src.booked += 1;
      src.revenue += value;
      inquiryToBooking.push(
        (b.updatedAt.getTime() - b.createdAt.getTime()) / 86400000
      );
    }
    sourceMap.set(source, src);

    const svc = serviceMap.get(service) ?? { inquiries: 0, booked: 0, value: 0 };
    svc.inquiries += 1;
    if (isClosedWonStatus(b.status) || normalizeInquiryStatus(b.status) === "booked") {
      svc.booked += 1;
      svc.value += value;
    }
    serviceMap.set(service, svc);

    if (!isOpenInquiryStatus(b.status) || normalizeInquiryStatus(b.status) !== "lead") {
      responseTimes.push((b.updatedAt.getTime() - b.createdAt.getTime()) / 3600000);
    }
  }

  const staleCutoff = Date.now() - 3 * 86400000;
  const lostInquiries: LostInquiry[] = bookings
    .filter((b) => isOpenInquiryStatus(b.status) && b.updatedAt.getTime() < staleCutoff)
    .slice(0, 10)
    .map((b) => {
      let name = b.contactEmail ?? "Unknown";
      try {
        name = String((JSON.parse(b.data) as Record<string, unknown>).fullName || name);
      } catch {
        /* ignore */
      }
      const daysSince = Math.round((Date.now() - b.updatedAt.getTime()) / 86400000);
      return {
        id: b.id,
        name,
        reason: daysSince > 7 ? "No response 7+ days" : "Stale 3+ days without follow-up",
        daysSince,
        estimatedValue: estimateBudgetValue(
          (() => {
            try {
              return String((JSON.parse(b.data) as Record<string, unknown>).budgetRange ?? "");
            } catch {
              return "";
            }
          })()
        ) || 1500,
        href: `/admin/submissions?type=booking&focus=${b.id}`,
      };
    });

  const bySource: BookingSourceMetric[] = [...sourceMap.entries()]
    .map(([source, s]) => ({
      source,
      inquiries: s.inquiries,
      bookings: s.booked,
      bookingRate: s.inquiries > 0 ? Math.round((s.booked / s.inquiries) * 1000) / 10 : 0,
      revenue: s.revenue,
      revenuePerInquiry: s.inquiries > 0 ? Math.round(s.revenue / s.inquiries) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byService: BookingServiceMetric[] = [...serviceMap.entries()]
    .map(([service, s]) => ({
      service,
      inquiries: s.inquiries,
      bookingRate: s.inquiries > 0 ? Math.round((s.booked / s.inquiries) * 1000) / 10 : 0,
      avgValue: s.booked > 0 ? Math.round(s.value / s.booked) : 0,
    }))
    .sort((a, b) => b.inquiries - a.inquiries);

  const totalBooked = bookings.filter(
    (b) => isClosedWonStatus(b.status) || normalizeInquiryStatus(b.status) === "booked"
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    avgResponseTimeHours:
      responseTimes.length > 0
        ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
        : 0,
    avgInquiryToBookingDays:
      inquiryToBooking.length > 0
        ? Math.round(inquiryToBooking.reduce((a, b) => a + b, 0) / inquiryToBooking.length)
        : 0,
    bySource,
    byService,
    lostInquiries,
    bookingRate:
      bookings.length > 0 ? Math.round((totalBooked / bookings.length) * 1000) / 10 : 0,
  };
}
