-- Submission CRM fields
ALTER TABLE "Submission" ADD COLUMN "notes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Submission" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Service featured + FAQs
ALTER TABLE "Service" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "faqs" TEXT NOT NULL DEFAULT '[]';

-- Testimonial client photos
ALTER TABLE "Testimonial" ADD COLUMN "image" TEXT;
ALTER TABLE "Testimonial" ADD COLUMN "imageAlt" TEXT NOT NULL DEFAULT '';

-- Session volume archive flag
ALTER TABLE "SessionVolume" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Service_featured_idx" ON "Service"("featured");
CREATE INDEX "SessionVolume_archived_idx" ON "SessionVolume"("archived");
