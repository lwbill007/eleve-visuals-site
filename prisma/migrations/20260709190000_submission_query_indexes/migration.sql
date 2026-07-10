-- Production launch: Submission indexes for inbox/analytics queries
CREATE INDEX IF NOT EXISTS "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Submission_createdAt_idx" ON "Submission"("createdAt");
CREATE INDEX IF NOT EXISTS "Submission_read_type_idx" ON "Submission"("read", "type");
