import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dollarsFromCents, getPaymentRevenueSummary, upsertPayment } from "@/lib/payments";
import { getConnectorHealth } from "@/lib/ai/platform/connectors";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

const manualPaymentSchema = z.object({
  amountDollars: z.number().finite().positive().max(10_000_000),
  customerEmail: z.string().email().max(320).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional(),
  submissionId: z.string().trim().max(100).optional(),
  paidAt: z.string().datetime().optional(),
});

const reconcilePaymentSchema = z.object({
  paymentId: z.string().min(1).max(100),
  verificationStatus: z.enum(["verified", "rejected"]),
});

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
      pendingManual: dollarsFromCents(summary.pendingManualCents),
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
      verificationStatus: p.verificationStatus,
      reconciledAt: p.reconciledAt?.toISOString() ?? null,
      reconciledBy: p.reconciledBy,
      paidAt: p.paidAt.toISOString(),
      stripePaymentId: p.stripePaymentId,
      submissionId: p.submissionId,
    })),
  });
}

/** Manual payment entry when Stripe webhook is not yet flowing. */
export async function POST(request: Request) {
  try {
    await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin:payments");
  if (blocked) return blocked;

  const parsed = manualPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 });
  }

  const body = parsed.data;
  const amountCents = Math.round(body.amountDollars * 100);
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
    verificationStatus: "pending",
    paidAt,
  });

  return NextResponse.json({ ok: true, payment: row });
}

/** Reconcile manual evidence before it can affect verified settled revenue. */
export async function PATCH(request: Request) {
  let session;
  try {
    session = await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin:payments-reconcile");
  if (blocked) return blocked;

  const parsed = reconcilePaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reconciliation payload" }, { status: 400 });
  }

  const existing = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { source: true },
  });
  if (!existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (existing.source !== "manual") {
    return NextResponse.json({ error: "Only manual payments require reconciliation" }, { status: 409 });
  }

  const payment = await prisma.payment.update({
    where: { id: parsed.data.paymentId },
    data: {
      verificationStatus: parsed.data.verificationStatus,
      reconciledAt: new Date(),
      reconciledBy: session.email ?? session.role,
    },
  });
  return NextResponse.json({ ok: true, payment });
}
