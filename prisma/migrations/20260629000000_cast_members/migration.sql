-- Production management: cast members per Volume + playlist field

ALTER TABLE "SessionVolume" ADD COLUMN IF NOT EXISTS "playlistUrl" TEXT;

CREATE TABLE IF NOT EXISTS "CastMember" (
  "id" TEXT NOT NULL,
  "volumeId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "stageName" TEXT NOT NULL DEFAULT '',
  "slug" TEXT NOT NULL DEFAULT '',
  "role" TEXT NOT NULL DEFAULT 'model',
  "profilePhoto" TEXT,
  "additionalPhotos" TEXT NOT NULL DEFAULT '[]',
  "bio" TEXT NOT NULL DEFAULT '',
  "instagram" TEXT NOT NULL DEFAULT '',
  "tiktok" TEXT NOT NULL DEFAULT '',
  "website" TEXT NOT NULL DEFAULT '',
  "portfolioLink" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "isAlumni" BOOLEAN NOT NULL DEFAULT false,
  "featuredAlumni" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT NOT NULL DEFAULT '',
  "futureCollaborations" TEXT NOT NULL DEFAULT '',
  "enableProfile" BOOLEAN NOT NULL DEFAULT false,
  "awards" TEXT NOT NULL DEFAULT '[]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CastMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CastMember_volumeId_sortOrder_idx" ON "CastMember"("volumeId", "sortOrder");
CREATE INDEX IF NOT EXISTS "CastMember_slug_idx" ON "CastMember"("slug");
CREATE INDEX IF NOT EXISTS "CastMember_featuredAlumni_idx" ON "CastMember"("featuredAlumni");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'CastMember_volumeId_fkey'
  ) THEN
    ALTER TABLE "CastMember"
      ADD CONSTRAINT "CastMember_volumeId_fkey"
      FOREIGN KEY ("volumeId") REFERENCES "SessionVolume"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
