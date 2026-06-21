import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [bookings, sessions, contacts, unreadBookings, unreadSessions, unreadContacts] =
    await Promise.all([
      prisma.submission.count({ where: { type: "booking" } }),
      prisma.submission.count({ where: { type: "session" } }),
      prisma.submission.count({ where: { type: "contact" } }),
      prisma.submission.count({ where: { type: "booking", read: false } }),
      prisma.submission.count({ where: { type: "session", read: false } }),
      prisma.submission.count({ where: { type: "contact", read: false } }),
    ]);

  const [portfolio, services, testimonials] = await Promise.all([
    prisma.portfolioItem.count(),
    prisma.service.count(),
    prisma.testimonial.count(),
  ]);

  return NextResponse.json({
    submissions: {
      booking: bookings,
      session: sessions,
      contact: contacts,
      unread: unreadBookings + unreadSessions + unreadContacts,
    },
    content: { portfolio, services, testimonials },
  });
}
