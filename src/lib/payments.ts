import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { normalizeInquiryStatus } from "@/lib/booking-pipeline";
import { sendEmail, depositConfirmedEmail } from "@/lib/email";
import { getSiteConfig } from "@/lib/content";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

export interface PaymentRevenueSummary {
  todayCents: number;
  thisMonthCents: number;
  lastMonthCents: number;
  totalCents: number;
  count: number;
  hasPayments: boolean;
  pendingManualCount: number;
  pendingManualCents: number;
}

export const VERIFIED_SETTLED_PAYMENT_WHERE = {
  status: "succeeded",
  verificationStatus: "verified",
} as const;

export function paymentCountsAsVerifiedRevenue(payment: {
  status: string;
  verificationStatus: string;
}): boolean {
  return payment.status === "succeeded" && payment.verificationStatus === "verified";
}

/** Real, Stripe-confirmed or reconciled revenue per client email — the one source of truth
 * any per-client "verified revenue" figure should use, rather than re-deriving it from
 * pipeline-stage estimates (see `estimateSubmissionValue()` for the estimate side). */
export async function getVerifiedRevenueByEmail(
  emails: string[]
): Promise<Map<string, { totalCents: number; count: number }>> {
  const map = new Map<string, { totalCents: number; count: number }>();
  const valid = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
  if (!valid.length) return map;

  const payments = await prisma.payment.findMany({
    where: { customerEmail: { in: valid }, ...VERIFIED_SETTLED_PAYMENT_WHERE },
    select: { customerEmail: true, amountCents: true },
  });
  for (const payment of payments) {
    const email = payment.customerEmail.toLowerCase().trim();
    const current = map.get(email) ?? { totalCents: 0, count: 0 };
    current.totalCents += payment.amountCents;
    current.count += 1;
    map.set(email, current);
  }
  return map;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Sum source-verified, succeeded payments for truth / operator metrics. */
export async function getPaymentRevenueSummary(now = new Date()): Promise<PaymentRevenueSummary> {
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [today, thisMonth, lastMonth, total, pendingManual] = await Promise.all([
    prisma.payment.aggregate({
      where: { ...VERIFIED_SETTLED_PAYMENT_WHERE, paidAt: { gte: todayStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { ...VERIFIED_SETTLED_PAYMENT_WHERE, paidAt: { gte: monthStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: {
        ...VERIFIED_SETTLED_PAYMENT_WHERE,
        paidAt: { gte: lastMonthStart, lt: monthStart },
      },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: VERIFIED_SETTLED_PAYMENT_WHERE,
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { source: "manual", status: "succeeded", verificationStatus: "pending" },
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
    pendingManualCount: pendingManual._count,
    pendingManualCents: pendingManual._sum.amountCents ?? 0,
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
  verificationStatus?: "pending" | "verified" | "rejected";
  reconciledAt?: Date | null;
  reconciledBy?: string;
  paidAt: Date;
  raw?: unknown;
}

export async function upsertPayment(input: UpsertPaymentInput) {
  if (input.amountCents <= 0) return null;

  // Stripe fires more than one event type for a single Checkout Session payment
  // (checkout.session.completed AND payment_intent.succeeded both reference the same
  // PaymentIntent id). Each has a distinct event.id, so the upsert below alone would
  // create two Payment rows for one real charge and double every revenue sum. Dedupe on
  // the payment intent id first — if some *other* event already recorded this exact
  // payment, return that row instead of creating a second one.
  if (input.stripePaymentId) {
    const alreadyRecorded = await prisma.payment.findFirst({
      where: { stripePaymentId: input.stripePaymentId, NOT: { stripeEventId: input.stripeEventId } },
    });
    if (alreadyRecorded) {
      // Webhook delivery order isn't guaranteed — backfill submissionId if the first event
      // that landed didn't have it but this one does, so booking↔payment linkage still works.
      if (!alreadyRecorded.submissionId && input.submissionId) {
        return prisma.payment.update({
          where: { id: alreadyRecorded.id },
          data: { submissionId: input.submissionId },
        });
      }
      return alreadyRecorded;
    }
  }

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
      verificationStatus:
        input.verificationStatus ?? (input.source === "manual" ? "pending" : "verified"),
      reconciledAt: input.reconciledAt ?? null,
      reconciledBy: input.reconciledBy ?? "",
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
      verificationStatus:
        input.verificationStatus ?? (input.source === "manual" ? "pending" : "verified"),
      reconciledAt: input.reconciledAt ?? null,
      reconciledBy: input.reconciledBy ?? "",
      paidAt: input.paidAt,
      raw: JSON.stringify(input.raw ?? {}),
    },
  });
}

/**
 * Refunds don't create a new Payment row (the old `amountCents <= 0` upsert path silently
 * discarded them entirely — they never showed up anywhere, and the original charge stayed
 * counted as verified revenue forever). Instead, mark the original payment's status so it
 * drops out of `VERIFIED_SETTLED_PAYMENT_WHERE` (which matches on `status: "succeeded"`).
 * A partial refund is treated the same as a full one — safer to undercount than to keep
 * claiming a partially-refunded charge as fully verified revenue.
 */
async function markPaymentRefunded(stripePaymentId: string, amountRefunded: number, event: unknown) {
  if (!stripePaymentId) return null;
  const payment = await prisma.payment.findFirst({ where: { stripePaymentId } });
  if (!payment) return null;

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: amountRefunded >= payment.amountCents ? "refunded" : "partially_refunded",
      raw: JSON.stringify(event),
    },
  });
}

/**
 * A verified Stripe payment linked to a submission that's still at "proposal" reads as the
 * deposit clearing — advance it to "booked" and notify both sides. Any other stage is left
 * alone (e.g. a repeat/manual payment on an already-booked project shouldn't move the stage).
 */
async function advanceBookingAfterDeposit(submissionId: string, amountCents: number) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, status: true, data: true, contactEmail: true },
  });
  if (!submission || normalizeInquiryStatus(submission.status) !== "proposal") return;

  // Stripe commonly delivers checkout.session.completed and payment_intent.succeeded for the
  // same deposit within milliseconds of each other, and both call this function. A plain
  // read-then-write here would let both invocations see "proposal" and both send the
  // "booking confirmed" email. The conditional updateMany makes the transition atomic —
  // only the invocation that actually flips the row proceeds to notify anyone.
  const { count } = await prisma.submission.updateMany({
    where: { id: submissionId, status: submission.status },
    data: { status: "booked" },
  });
  if (count === 0) return;

  void invalidateIntelligenceCaches().catch(() => {});

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const clientName = typeof data.fullName === "string" ? data.fullName : "Client";
  const amount = dollarsFromCents(amountCents);

  const [siteConfig] = await Promise.all([getSiteConfig().catch(() => null)]);
  const recipients: Promise<unknown>[] = [];
  if (submission.contactEmail) {
    const mail = depositConfirmedEmail({ name: clientName, amount, isAdminCopy: false });
    recipients.push(
      sendEmail({
        to: submission.contactEmail,
        subject: mail.subject,
        html: mail.html,
        replyTo: siteConfig?.email,
      })
    );
  }
  if (siteConfig?.email) {
    const mail = depositConfirmedEmail({ name: clientName, amount, isAdminCopy: true });
    recipients.push(sendEmail({ to: siteConfig.email, subject: mail.subject, html: mail.html }));
  }
  await Promise.allSettled(recipients);
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
    void invalidateIntelligenceCaches().catch(() => {});
    const submissionId = asString(asObj(obj.metadata)?.submissionId);
    if (submissionId) await advanceBookingAfterDeposit(submissionId, amount).catch(() => {});
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
    void invalidateIntelligenceCaches().catch(() => {});
    const submissionId = asString(asObj(obj.metadata)?.submissionId);
    if (submissionId) await advanceBookingAfterDeposit(submissionId, amount).catch(() => {});
    return { ok: true as const, type: event.type };
  }

  if (event.type === "charge.refunded") {
    const amountRefunded = asNumber(obj.amount_refunded);
    if (amountRefunded > 0) {
      const stripePaymentId = asString(obj.payment_intent) || asString(obj.id);
      await markPaymentRefunded(stripePaymentId, amountRefunded, event);
      void invalidateIntelligenceCaches().catch(() => {});
      return { ok: true as const, type: event.type };
    }
  }

  return { ok: false as const, reason: "ignored_type", type: event.type };
}
