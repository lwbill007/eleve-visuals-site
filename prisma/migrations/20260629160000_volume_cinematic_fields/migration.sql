-- Cinematic Volume page fields: production-info extras, creative vision, testimonials

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "mood" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "season" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "colorPalette" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "inspirations" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "testimonials" TEXT NOT NULL DEFAULT '[]';
