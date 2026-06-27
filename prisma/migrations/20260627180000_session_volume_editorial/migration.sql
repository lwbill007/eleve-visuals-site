-- Session volumes: director's note + gallery delivery estimate (editorial fields)

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "directorsNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "galleryDelivery" TEXT NOT NULL DEFAULT '';
