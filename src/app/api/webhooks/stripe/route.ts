import { NextResponse } from "next/server";
import { ingestStripeEvent, verifyStripeSignature } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Stripe webhook — stores settled payments for Verified revenue.
 * Configure endpoint: POST /api/webhooks/stripe
 * Required env: STRIPE_WEBHOOK_SECRET
 * Events: payment_intent.succeeded, checkout.session.completed, charge.refunded
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    id: string;
    type: string;
    data?: { object?: unknown };
    created?: number;
  };

  try {
    event = JSON.parse(payload) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event.id || !event.type) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  try {
    const result = await ingestStripeEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error("[stripe webhook]", err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
