-- Notification system upgrades: submission metadata, log workflow, push subscriptions

-- Capture submitter metadata for spam review (admin-only)
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "userAgent" TEXT NOT NULL DEFAULT '';

-- Read / archive workflow for notification history
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "NotificationLog" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "NotificationLog_archived_createdAt_idx" ON "NotificationLog"("archived", "createdAt");

-- Web push subscriptions for browser/mobile notifications
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_createdAt_idx" ON "PushSubscription"("createdAt");
