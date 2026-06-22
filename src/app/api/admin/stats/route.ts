import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    totalApplications,
    newApplications,
    totalContacts,
    unreadTotal,
    portfolioTotal,
    portfolioPublished,
    servicesTotal,
    servicesPublished,
    testimonialsTotal,
    activeSessions,
    openApplications,
    recentActivity,
    pageviews7d,
  ] = await Promise.all([
    prisma.submission.count({ where: { type: "booking" } }),
    prisma.submission.count({
      where: { type: "booking", status: { in: ["new", "contacted"] } },
    }),
    prisma.submission.count({ where: { type: "booking", status: "scheduled" } }),
    prisma.submission.count({ where: { type: "booking", status: "completed" } }),
    prisma.submission.count({ where: { type: "session" } }),
    prisma.submission.count({ where: { type: "session", status: "pending_review" } }),
    prisma.submission.count({ where: { type: "contact" } }),
    prisma.submission.count({ where: { read: false } }),
    prisma.portfolioItem.count(),
    prisma.portfolioItem.count({ where: { published: true, archived: false } }),
    prisma.service.count(),
    prisma.service.count({ where: { published: true, archived: false } }),
    prisma.testimonial.count(),
    prisma.sessionVolume.count({ where: { published: true, archived: false } }),
    prisma.sessionVolume.count({
      where: { published: true, status: "applications_open", archived: false },
    }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        type: true,
        status: true,
        read: true,
        data: true,
        createdAt: true,
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        type: "pageview",
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  function parseName(data: string): string {
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      return (
        (typeof parsed.fullName === "string" && parsed.fullName) ||
        (typeof parsed.name === "string" && parsed.name) ||
        ""
      );
    } catch {
      return "";
    }
  }

  return NextResponse.json({
    bookings: {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
    },
    applications: {
      total: totalApplications,
      new: newApplications,
    },
    inquiries: {
      total: totalBookings + totalApplications + totalContacts,
      unread: unreadTotal,
      contact: totalContacts,
    },
    content: {
      portfolio: portfolioTotal,
      portfolioPublished,
      services: servicesTotal,
      servicesPublished,
      testimonials: testimonialsTotal,
      sessions: activeSessions,
      openApplications,
    },
    analytics: {
      pageviews7d,
    },
    recentActivity: recentActivity.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      read: item.read,
      name: parseName(item.data),
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
