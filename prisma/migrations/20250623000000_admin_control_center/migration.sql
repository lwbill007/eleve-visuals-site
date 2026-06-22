-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "deliverables" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Service" ADD COLUMN "turnaround" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Service" ADD COLUMN "bannerImage" TEXT;
ALTER TABLE "Service" ADD COLUMN "thumbnailImage" TEXT;
ALTER TABLE "Service" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL DEFAULT '',
    "alt" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- Migrate legacy inquiry statuses
UPDATE "Submission" SET "status" = 'scheduled' WHERE "status" = 'booked';
UPDATE "Submission" SET "status" = 'archived' WHERE "status" = 'closed';
