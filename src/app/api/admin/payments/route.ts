import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dollarsFromCents, getPaymentRevenueSummary, upsertPayment } from "@/lib/payments";
import { getConnectorHealth } from "@/lib/ai/platform/connectors";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

  const [summary, rows, stripe] = await Promise.all([
    getPaymentRevenueSummary(),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: limit,
    }),
    Promise.resolve(getConnectorHealth().find((c) => c.id === "stripe")),
  ]);

  return NextResponse.json({
    summary: {
      ...summary,
      today: dollarsFromCents(summary.todayCents),
      thisMonth: dollarsFromCents(summary.thisMonthCents),
      lastMonth: dollarsFromCents(summary.lastMonthCents),
      total: dollarsFromCents(summary.totalCents),
    },
    stripe: {
      health: stripe?.health ?? "disconnected",
      connected: stripe?.connected ?? false,
      missing: stripe?.missingPermissions ?? [],
    },
    payments: rows.map((p) => ({
      id: p.id,
      amount: dollarsFromCents(p.amountCents),
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      customerEmail: p.customerEmail,
      description: p.description,
      source: p.source,
      paidAt: p.paidAt.toISOString(),
      stripePaymentId: p.stripePaymentId,
      submissionId: p.submissionId,
    })),
  });
}

/** Manual payment entry when Stripe webhook is not yet flowing. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    amountDollars?: number;
    customerEmail?: string;
    description?: string;
    submissionId?: string;
    paidAt?: string;
  };

  const amountCents = Math.round((body.amountDollars ?? 0) * 100);
  if (amountCents <= 0) {
    return NextResponse.json({ error: "amountDollars required" }, { status: 400 });
  }

  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
  const eventId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const row = await upsertPayment({
    stripeEventId: eventId,
    stripePaymentId: eventId,
    amountCents,
    currency: "usd",
    status: "succeeded",
    customerEmail: body.customerEmail ?? "",
    description: body.description ?? "Manual entry",
    submissionId: body.submissionId ?? null,
    source: "manual",
    paidAt,
  });

  return NextResponse.json({ ok: true, payment: row });
}
