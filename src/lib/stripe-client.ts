import "server-only";
import Stripe from "stripe";
import { estimateSubmissionValue } from "@/lib/estimate-budget";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export interface DepositCheckoutInput {
  submissionId: string;
  clientName: string;
  packageName: string;
  clientEmail?: string;
  data: Record<string, unknown>;
  successUrl: string;
  cancelUrl: string;
}

/** Creates a Stripe Checkout Session for the 50% deposit — matches the documented booking-terms policy. */
export async function createDepositCheckoutSession(input: DepositCheckoutInput): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.");
  }
  const stripe = getStripeClient();
  const totalValue = estimateSubmissionValue(input.data);
  const depositCents = Math.round(totalValue * 0.5 * 100);
  if (depositCents <= 0) {
    throw new Error("Could not determine a deposit amount for this booking.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Deposit — ${input.packageName}` },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    customer_email: input.clientEmail,
    metadata: { submissionId: input.submissionId },
    // Session-level metadata isn't automatically copied onto the underlying PaymentIntent,
    // but Stripe fires both checkout.session.completed and payment_intent.succeeded for this
    // payment — set it here too so submissionId is present regardless of event delivery order.
    payment_intent_data: { metadata: { submissionId: input.submissionId } },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }
  return session.url;
}
