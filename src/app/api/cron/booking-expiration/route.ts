import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  bookingLeadExpiryCutoff,
  UNREACHED_BOOKING_EXPIRY_DAYS,
} from "@/lib/booking-expiration";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = bookingLeadExpiryCutoff();
  const archived = await prisma.submission.updateMany({
    where: {
      type: "booking",
      status: { in: ["lead", "new"] },
      createdAt: { lte: cutoff },
    },
    data: { status: "archived" },
  });

  return NextResponse.json({
    ok: true,
    archived: archived.count,
    policyDays: UNREACHED_BOOKING_EXPIRY_DAYS,
    cutoff: cutoff.toISOString(),
  });
}
