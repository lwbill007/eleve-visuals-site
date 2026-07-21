import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBusinessTimeline } from "@/lib/ai/intelligence/business-timeline";
import { getRecentBusinessEvents } from "@/lib/ai/platform/business-events";
import { prisma } from "@/lib/db";
import { dollarsFromCents } from "@/lib/payments";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") || 40), 100);

  const [milestones, events, payments, missions] = await Promise.all([
    getBusinessTimeline(limit),
    getRecentBusinessEvents(limit),
    prisma.payment.findMany({
      where: { status: "succeeded", verificationStatus: "verified" },
      orderBy: { paidAt: "desc" },
      take: 15,
    }),
    prisma.aIMemory.findMany({
      where: { category: "mission_outcome" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        summary: true,
        updatedAt: true,
        confidence: true,
        verificationStatus: true,
      },
    }),
  ]);

  const paymentEvents = payments.map((p) => ({
    id: `pay-${p.id}`,
    date: p.paidAt.toISOString(),
    title: `Payment ${p.status}: $${dollarsFromCents(p.amountCents).toLocaleString()}`,
    detail: [p.customerEmail, p.description].filter(Boolean).join(" · ") || "Settled payment",
    category: "revenue" as const,
    impact: `$${dollarsFromCents(p.amountCents).toLocaleString()}`,
    source: p.source === "manual" ? "Manual entry" : "Stripe",
    verified: true,
  }));

  const missionEvents = missions.map((m) => ({
    id: `mission-${m.id}`,
    date: m.updatedAt.toISOString(),
    title: m.title,
    detail: m.summary,
    category: "learning" as const,
    source: "Mission outcome",
    verified: m.verificationStatus === "verified" || m.verificationStatus === "trusted",
  }));

  const businessEventRows = events.map((e) => ({
    id: e.id,
    date: e.at,
    title: e.type.replace(/_/g, " "),
    detail: e.entityId ? `${e.type} · ${e.entityId}` : e.type,
    category: "milestone" as const,
    source: e.actor || "Business event",
    verified: true,
  }));

  const merged = [...milestones, ...paymentEvents, ...missionEvents, ...businessEventRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  return NextResponse.json({ generatedAt: new Date().toISOString(), events: merged });
}
