-- CreateTable
CREATE TABLE "AIMemoryEmbedding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'default',
    "memoryId" TEXT,
    "chunkKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "layer" TEXT NOT NULL DEFAULT 'operational',
    "category" TEXT NOT NULL DEFAULT '',
    "sourcePage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMemoryEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIMemoryEmbedding_workspaceId_chunkKey_key" ON "AIMemoryEmbedding"("workspaceId", "chunkKey");

-- CreateIndex
CREATE INDEX "AIMemoryEmbedding_workspaceId_memoryId_idx" ON "AIMemoryEmbedding"("workspaceId", "memoryId");

-- CreateIndex
CREATE INDEX "AIMemoryEmbedding_workspaceId_layer_idx" ON "AIMemoryEmbedding"("workspaceId", "layer");
