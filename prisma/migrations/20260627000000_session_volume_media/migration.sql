-- Session volumes: behind-the-scenes gallery + uploaded videos

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "btsGallery" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "videos" TEXT NOT NULL DEFAULT '[]';
