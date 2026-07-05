-- CreateTable
CREATE TABLE "AIMemory" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '{}',
    "messages" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAutomation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "trigger" TEXT NOT NULL DEFAULT '{}',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AINotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '',
    "metric" TEXT NOT NULL DEFAULT '',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AINotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AICache" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIMemory_category_idx" ON "AIMemory"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AIMemory_category_key_key" ON "AIMemory"("category", "key");

-- CreateIndex
CREATE INDEX "AIConversation_page_updatedAt_idx" ON "AIConversation"("page", "updatedAt");

-- CreateIndex
CREATE INDEX "AIAutomation_enabled_idx" ON "AIAutomation"("enabled");

-- CreateIndex
CREATE INDEX "AINotification_read_dismissed_createdAt_idx" ON "AINotification"("read", "dismissed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AICache_key_key" ON "AICache"("key");

-- CreateIndex
CREATE INDEX "AICache_expiresAt_idx" ON "AICache"("expiresAt");
