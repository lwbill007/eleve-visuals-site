-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX "Submission_type_status_idx" ON "Submission"("type", "status");

-- CreateIndex
CREATE INDEX "Submission_type_createdAt_idx" ON "Submission"("type", "createdAt");
