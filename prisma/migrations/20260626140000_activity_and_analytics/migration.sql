-- Admin activity log + repeat-contact tagging + response-time tracking

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Submission_contactEmail_idx" ON "Submission"("contactEmail");

-- Backfill contactEmail from JSON payloads, ignoring rows with invalid JSON.
DO $$
DECLARE
  rec RECORD;
  parsed jsonb;
BEGIN
  FOR rec IN SELECT "id", "data" FROM "Submission" WHERE "contactEmail" = '' LOOP
    BEGIN
      parsed := rec."data"::jsonb;
      IF parsed ? 'email' THEN
        UPDATE "Submission"
        SET "contactEmail" = lower(trim(parsed ->> 'email'))
        WHERE "id" = rec."id";
      END IF;
    EXCEPTION WHEN others THEN
      -- Skip malformed payloads
      NULL;
    END;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'admin',
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
