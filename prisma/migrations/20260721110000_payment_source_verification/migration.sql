ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reconciledBy" TEXT NOT NULL DEFAULT '';

UPDATE "Payment"
SET "verificationStatus" = CASE
  WHEN "source" = 'stripe' THEN 'verified'
  ELSE 'pending'
END
WHERE "verificationStatus" = 'pending';

CREATE INDEX IF NOT EXISTS "Payment_verificationStatus_status_paidAt_idx"
ON "Payment"("verificationStatus", "status", "paidAt");
