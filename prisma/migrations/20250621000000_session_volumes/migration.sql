-- CreateTable
CREATE TABLE "SessionVolume" (
    "id" TEXT NOT NULL,
    "volumeNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "synopsis" TEXT NOT NULL DEFAULT '',
    "posterImage" TEXT,
    "posterImageAlt" TEXT NOT NULL DEFAULT '',
    "bannerImage" TEXT,
    "bannerImageAlt" TEXT NOT NULL DEFAULT '',
    "moodBoard" TEXT NOT NULL DEFAULT '[]',
    "gallery" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "genre" TEXT NOT NULL DEFAULT '',
    "year" TEXT NOT NULL DEFAULT '',
    "sessionDate" TEXT NOT NULL DEFAULT '',
    "sessionTime" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "capacity" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "creativeDirector" TEXT NOT NULL DEFAULT '',
    "dressCode" TEXT NOT NULL DEFAULT '',
    "runtime" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '[]',
    "timeline" TEXT NOT NULL DEFAULT '[]',
    "applicationDeadline" TIMESTAMP(3),
    "teaserVideoUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showApplyButton" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionVolume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionVolume_slug_key" ON "SessionVolume"("slug");

-- CreateIndex
CREATE INDEX "SessionVolume_published_status_idx" ON "SessionVolume"("published", "status");

-- CreateIndex
CREATE INDEX "SessionVolume_featured_idx" ON "SessionVolume"("featured");

-- CreateIndex
CREATE INDEX "SessionVolume_volumeNumber_idx" ON "SessionVolume"("volumeNumber");
