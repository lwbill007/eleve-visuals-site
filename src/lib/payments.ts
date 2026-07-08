import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export interface PaymentRevenueSummary {
  todayCents: number;
  thisMonthCents: number;
  lastMonthCents: number;
  totalCents: number;
  count: number;
  hasPayments: boolean;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Sum succeeded payments for truth / operator metrics. */
export async function getPaymentRevenueSummary(now = new Date()): Promise<PaymentRevenueSummary> {
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [today, thisMonth, lastMonth, total] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "succeeded", paidAt: { gte: todayStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "succeeded", paidAt: { gte: monthStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: "succeeded", paidAt: { gte: lastMonthStart, lt: monthStart } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { status: "succeeded" },
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);

  const totalCents = total._sum.amountCents ?? 0;
  return {
    todayCents: today._sum.amountCents ?? 0,
    thisMonthCents: thisMonth._sum.amountCents ?? 0,
    lastMonthCents: lastMonth._sum.amountCents ?? 0,
    totalCents,
    count: total._count,
    hasPayments: total._count > 0,
  };
}

export function dollarsFromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Verify Stripe-Signature header without the Stripe SDK. */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSec = 300
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=")];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(v1, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface UpsertPaymentInput {
  stripeEventId: string;
  stripePaymentId?: string;
  amountCents: number;
  currency?: string;
  status?: string;
  customerEmail?: string;
  description?: string;
  submissionId?: string | null;
  source?: string;
  paidAt: Date;
  raw?: unknown;
}

export async function upsertPayment(input: UpsertPaymentInput) {
  if (input.amountCents <= 0) return null;

  return prisma.payment.upsert({
    where: { stripeEventId: input.stripeEventId },
    create: {
      stripeEventId: input.stripeEventId,
      stripePaymentId: input.stripePaymentId ?? "",
      amountCents: input.amountCents,
      currency: (input.currency ?? "usd").toLowerCase(),
      status: input.status ?? "succeeded",
      customerEmail: input.customerEmail ?? "",
      description: input.description ?? "",
      submissionId: input.submissionId ?? null,
      source: input.source ?? "stripe",
      paidAt: input.paidAt,
      raw: JSON.stringify(input.raw ?? {}),
    },
    update: {
      stripePaymentId: input.stripePaymentId ?? "",
      amountCents: input.amountCents,
      currency: (input.currency ?? "usd").toLowerCase(),
      status: input.status ?? "succeeded",
      customerEmail: input.customerEmail ?? "",
      description: input.description ?? "",
      paidAt: input.paidAt,
      raw: JSON.stringify(input.raw ?? {}),
    },
  });
}

type StripeObject = Record<string, unknown>;

function asObj(v: unknown): StripeObject | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as StripeObject) : null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Map supported Stripe event types into a Payment upsert. */
export async function ingestStripeEvent(event: {
  id: string;
  type: string;
  data?: { object?: unknown };
  created?: number;
}) {
  const obj = asObj(event.data?.object);
  if (!obj) return { ok: false as const, reason: "missing_object" };

  const paidAt = event.created
    ? new Date(event.created * 1000)
    : new Date();

  if (event.type === "payment_intent.succeeded") {
    const amount = asNumber(obj.amount_received) || asNumber(obj.amount);
    const charges = asObj(obj.charges);
    const data = Array.isArray(charges?.data) ? charges.data : [];
    const firstCharge = asObj(data[0]);
    const billing = asObj(firstCharge?.billing_details);
    const email =
      asString(obj.receipt_email) ||
      asString(billing?.email) ||
      asString(asObj(obj.metadata)?.email);

    await upsertPayment({
      stripeEventId: event.id,
      stripePaymentId: asString(obj.id),
      amountCents: amount,
      currency: asString(obj.currency) || "usd",
      status: "succeeded",
      customerEmail: email,
      description: asString(obj.description) || asString(asObj(obj.metadata)?.description),
      submissionId: asString(asObj(obj.metadata)?.submissionId) || null,
      paidAt,
      raw: event,
    });
    return { ok: true as const, type: event.type };
  }

  if (event.type === "checkout.session.completed") {
    const amount = asNumber(obj.amount_total);
    const customerDetails = asObj(obj.customer_details);
    await upsertPayment({
      stripeEventId: event.id,
      stripePaymentId: asString(obj.payment_intent) || asString(obj.id),
      amountCents: amount,
      currency: asString(obj.currency) || "usd",
      status: asString(obj.payment_status) === "paid" ? "succeeded" : asString(obj.payment_status) || "succeeded",
      customerEmail: asString(customerDetails?.email) || asString(obj.customer_email),
      description: asString(asObj(obj.metadata)?.description) || "Checkout",
      submissionId: asString(asObj(obj.metadata)?.submissionId) || null,
      paidAt,
      raw: event,
    });
    return { ok: true as const, type: event.type };
  }

  if (event.type === "charge.refunded") {
    const amountRefunded = asNumber(obj.amount_refunded);
    if (amountRefunded > 0) {
      await upsertPayment({
        stripeEventId: event.id,
        stripePaymentId: asString(obj.payment_intent) || asString(obj.id),
        amountCents: -amountRefunded,
        currency: asString(obj.currency) || "usd",
        status: "refunded",
        customerEmail: asString(asObj(obj.billing_details)?.email),
        description: "Refund",
        paidAt,
        raw: event,
      });
      return { ok: true as const, type: event.type };
    }
  }

  return { ok: false as const, reason: "ignored_type", type: event.type };
}
