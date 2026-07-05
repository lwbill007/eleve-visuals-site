-- ÉLEVÉ AI Intelligence Memory Layer

-- Extend AIMemory with multi-layer architecture
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "layer" TEXT NOT NULL DEFAULT 'operational';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7;
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "importance" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "sourceRef" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "tags" TEXT NOT NULL DEFAULT '[]';

-- Migrate legacy categories to memory layers
UPDATE "AIMemory" SET "layer" = 'crm' WHERE "category" = 'client';
UPDATE "AIMemory" SET "layer" = 'brand' WHERE "category" = 'page';
UPDATE "AIMemory" SET "layer" = 'sessions' WHERE "category" = 'session';

-- Drop old unique constraint and indexes
DROP INDEX IF EXISTS "AIMemory_category_key_key";
DROP INDEX IF EXISTS "AIMemory_category_idx";

-- New indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS "AIMemory_workspaceId_layer_category_key_key"
  ON "AIMemory"("workspaceId", "layer", "category", "key");
CREATE INDEX IF NOT EXISTS "AIMemory_workspaceId_layer_archived_updatedAt_idx"
  ON "AIMemory"("workspaceId", "layer", "archived", "updatedAt");
CREATE INDEX IF NOT EXISTS "AIMemory_workspaceId_pinned_idx"
  ON "AIMemory"("workspaceId", "pinned");
CREATE INDEX IF NOT EXISTS "AIMemory_layer_category_idx"
  ON "AIMemory"("layer", "category");

-- Knowledge graph edges
CREATE TABLE IF NOT EXISTS "AIMemoryRelation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'default',
    "fromMemoryId" TEXT NOT NULL,
    "toMemoryId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMemoryRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AIMemoryRelation_fromMemoryId_toMemoryId_relationType_key"
  ON "AIMemoryRelation"("fromMemoryId", "toMemoryId", "relationType");
CREATE INDEX IF NOT EXISTS "AIMemoryRelation_workspaceId_relationType_idx"
  ON "AIMemoryRelation"("workspaceId", "relationType");

ALTER TABLE "AIMemoryRelation" DROP CONSTRAINT IF EXISTS "AIMemoryRelation_fromMemoryId_fkey";
ALTER TABLE "AIMemoryRelation" ADD CONSTRAINT "AIMemoryRelation_fromMemoryId_fkey"
  FOREIGN KEY ("fromMemoryId") REFERENCES "AIMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIMemoryRelation" DROP CONSTRAINT IF EXISTS "AIMemoryRelation_toMemoryId_fkey";
ALTER TABLE "AIMemoryRelation" ADD CONSTRAINT "AIMemoryRelation_toMemoryId_fkey"
  FOREIGN KEY ("toMemoryId") REFERENCES "AIMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Learning outcomes
CREATE TABLE IF NOT EXISTS "AILearningOutcome" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL DEFAULT 'default',
    "domain" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionRef" TEXT NOT NULL DEFAULT '',
    "hypothesis" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "revenueImpact" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "memoryIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AILearningOutcome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AILearningOutcome_workspaceId_domain_createdAt_idx"
  ON "AILearningOutcome"("workspaceId", "domain", "createdAt");

-- Memory audit trail
CREATE TABLE IF NOT EXISTS "AIMemoryAudit" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" TEXT NOT NULL DEFAULT '{}',
    "after" TEXT NOT NULL DEFAULT '{}',
    "actor" TEXT NOT NULL DEFAULT 'system',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMemoryAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AIMemoryAudit_memoryId_createdAt_idx"
  ON "AIMemoryAudit"("memoryId", "createdAt");

ALTER TABLE "AIMemoryAudit" DROP CONSTRAINT IF EXISTS "AIMemoryAudit_memoryId_fkey";
ALTER TABLE "AIMemoryAudit" ADD CONSTRAINT "AIMemoryAudit_memoryId_fkey"
  FOREIGN KEY ("memoryId") REFERENCES "AIMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
