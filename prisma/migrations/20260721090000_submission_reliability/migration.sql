ALTER TABLE "Submission"
ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Submission_idempotencyKey_key"
ON "Submission"("idempotencyKey");

ALTER TABLE "MediaAsset"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '',
ADD COLUMN "uploadTokenHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN "submissionId" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3);

CREATE INDEX "MediaAsset_purpose_claimedAt_createdAt_idx"
ON "MediaAsset"("purpose", "claimedAt", "createdAt");

CREATE INDEX "MediaAsset_uploadTokenHash_idx"
ON "MediaAsset"("uploadTokenHash");

CREATE INDEX "MediaAsset_submissionId_idx"
ON "MediaAsset"("submissionId");
