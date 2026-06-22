-- Portfolio cinematic redesign fields
ALTER TABLE "PortfolioItem" ADD COLUMN "slug" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN "subtitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PortfolioItem" ADD COLUMN "heroImage" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN "heroImageAlt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PortfolioItem" ADD COLUMN "creativeProcess" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PortfolioItem" ADD COLUMN "deliverables" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PortfolioItem" ADD COLUMN "credits" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PortfolioItem" ADD COLUMN "videos" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PortfolioItem" ADD COLUMN "btsGallery" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PortfolioItem" ADD COLUMN "relatedServices" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "PortfolioItem" ADD COLUMN "portfolioFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PortfolioItem" ADD COLUMN "seoTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PortfolioItem" ADD COLUMN "seoDescription" TEXT NOT NULL DEFAULT '';

-- Backfill slugs for existing rows
UPDATE "PortfolioItem"
SET "slug" = lower(regexp_replace(regexp_replace(trim("title"), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || left("id", 8)
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "PortfolioItem" SET "slug" = 'project-' || "id" WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "PortfolioItem" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "PortfolioItem_slug_key" ON "PortfolioItem"("slug");

CREATE INDEX "PortfolioItem_portfolioFeatured_idx" ON "PortfolioItem"("portfolioFeatured");
