-- Session applications upgrade
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "starred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "sessionVolumeId" TEXT;

CREATE INDEX IF NOT EXISTS "Submission_sessionVolumeId_type_idx" ON "Submission"("sessionVolumeId", "type");

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "applicationSettings" TEXT NOT NULL DEFAULT '{}';

-- Migrate legacy application statuses
UPDATE "Submission" SET "status" = 'pending_review' WHERE "type" = 'session' AND "status" = 'new';
UPDATE "Submission" SET "status" = 'shortlisted' WHERE "type" = 'session' AND "status" = 'contacted';
UPDATE "Submission" SET "status" = 'declined' WHERE "type" = 'session' AND "status" = 'rejected';
UPDATE "Submission" SET "status" = 'accepted' WHERE "type" = 'session' AND "status" = 'confirmed';
