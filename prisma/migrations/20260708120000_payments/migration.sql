-- Settled payments for verified revenue (Stripe webhook + optional manual)
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "submissionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'stripe',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "raw" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeEventId_key" ON "Payment"("stripeEventId");
CREATE INDEX IF NOT EXISTS "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX IF NOT EXISTS "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");
CREATE INDEX IF NOT EXISTS "Payment_customerEmail_idx" ON "Payment"("customerEmail");
CREATE INDEX IF NOT EXISTS "Payment_submissionId_idx" ON "Payment"("submissionId");
