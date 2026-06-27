-- Notification system: delivery log for email/SMS notifications
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "formType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "recipient" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "preview" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_channel_status_idx" ON "NotificationLog"("channel", "status");
CREATE INDEX IF NOT EXISTS "NotificationLog_dedupeKey_createdAt_idx" ON "NotificationLog"("dedupeKey", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_submissionId_idx" ON "NotificationLog"("submissionId");
