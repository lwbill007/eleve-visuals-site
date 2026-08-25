-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sessionType" TEXT NOT NULL DEFAULT '',
    "submissionId" TEXT,
    "clientName" TEXT NOT NULL DEFAULT '',
    "clientEmail" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "accessMode" TEXT NOT NULL DEFAULT 'code',
    "accessCodeHash" TEXT NOT NULL DEFAULT '',
    "accessEpoch" INTEGER NOT NULL DEFAULT 1,
    "downloadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "downloadQuality" TEXT NOT NULL DEFAULT 'high',
    "allowDownloadOriginals" BOOLEAN NOT NULL DEFAULT false,
    "favoriteEnabled" BOOLEAN NOT NULL DEFAULT true,
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GallerySection" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GallerySection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "sectionId" TEXT,
    "storageKeyOriginal" TEXT NOT NULL,
    "storageKeyLarge" TEXT,
    "storageKeyDisplay" TEXT,
    "storageKeyThumbnail" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "size" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "blurColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "caption" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "processingError" TEXT NOT NULL DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryAccessSession" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "epoch" INTEGER NOT NULL DEFAULT 1,
    "ipHash" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GalleryAccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryFavorite" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryComment" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryArchive" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "quality" TEXT NOT NULL DEFAULT 'high',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 0,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryEvent" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "photoId" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_slug_key" ON "Gallery"("slug");

-- CreateIndex
CREATE INDEX "Gallery_status_createdAt_idx" ON "Gallery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Gallery_submissionId_idx" ON "Gallery"("submissionId");

-- CreateIndex
CREATE INDEX "Gallery_clientEmail_idx" ON "Gallery"("clientEmail");

-- CreateIndex
CREATE INDEX "Gallery_expiresAt_idx" ON "Gallery"("expiresAt");

-- CreateIndex
CREATE INDEX "GallerySection_galleryId_sortOrder_idx" ON "GallerySection"("galleryId", "sortOrder");

-- CreateIndex
CREATE INDEX "GalleryPhoto_galleryId_sortOrder_idx" ON "GalleryPhoto"("galleryId", "sortOrder");

-- CreateIndex
CREATE INDEX "GalleryPhoto_galleryId_status_idx" ON "GalleryPhoto"("galleryId", "status");

-- CreateIndex
CREATE INDEX "GalleryPhoto_sectionId_sortOrder_idx" ON "GalleryPhoto"("sectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAccessSession_tokenHash_key" ON "GalleryAccessSession"("tokenHash");

-- CreateIndex
CREATE INDEX "GalleryAccessSession_galleryId_revokedAt_idx" ON "GalleryAccessSession"("galleryId", "revokedAt");

-- CreateIndex
CREATE INDEX "GalleryAccessSession_expiresAt_idx" ON "GalleryAccessSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GalleryFavorite_galleryId_createdAt_idx" ON "GalleryFavorite"("galleryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryFavorite_photoId_sessionId_key" ON "GalleryFavorite"("photoId", "sessionId");

-- CreateIndex
CREATE INDEX "GalleryComment_galleryId_createdAt_idx" ON "GalleryComment"("galleryId", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryComment_photoId_idx" ON "GalleryComment"("photoId");

-- CreateIndex
CREATE INDEX "GalleryArchive_galleryId_quality_status_idx" ON "GalleryArchive"("galleryId", "quality", "status");

-- CreateIndex
CREATE INDEX "GalleryArchive_expiresAt_idx" ON "GalleryArchive"("expiresAt");

-- CreateIndex
CREATE INDEX "GalleryEvent_galleryId_type_createdAt_idx" ON "GalleryEvent"("galleryId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryEvent_galleryId_createdAt_idx" ON "GalleryEvent"("galleryId", "createdAt");

-- AddForeignKey
ALTER TABLE "GallerySection" ADD CONSTRAINT "GallerySection_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "GallerySection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryAccessSession" ADD CONSTRAINT "GalleryAccessSession_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "GalleryPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryFavorite" ADD CONSTRAINT "GalleryFavorite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GalleryAccessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryComment" ADD CONSTRAINT "GalleryComment_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryComment" ADD CONSTRAINT "GalleryComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "GalleryPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryComment" ADD CONSTRAINT "GalleryComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GalleryAccessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryArchive" ADD CONSTRAINT "GalleryArchive_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryEvent" ADD CONSTRAINT "GalleryEvent_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
