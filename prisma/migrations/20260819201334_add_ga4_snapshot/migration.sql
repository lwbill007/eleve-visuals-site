-- DropIndex
DROP INDEX "SessionVolume_archived_idx";

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "GA4Snapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GA4Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GA4Snapshot_date_key" ON "GA4Snapshot"("date");

-- CreateIndex
CREATE INDEX "GA4Snapshot_date_idx" ON "GA4Snapshot"("date");

-- CreateIndex
CREATE INDEX "Submission_starred_type_idx" ON "Submission"("starred", "type");
