-- Reference one existing uploaded video (MediaAsset) as the cinematic hero per Volume.

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "featuredMediaId" TEXT;
