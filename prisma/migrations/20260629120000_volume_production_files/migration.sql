-- Production files & expanded behind-the-scenes fields for Volumes

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "interviews" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "audio" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "productionNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "callSheet" TEXT;
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "creativeBrief" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "wardrobeGuide" TEXT;
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "sponsors" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "resources" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "faqs" TEXT NOT NULL DEFAULT '[]';
