-- Add verification lifecycle to AIMemory
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "AIMemory" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "AIMemory_workspaceId_verificationStatus_idx" ON "AIMemory"("workspaceId", "verificationStatus");

-- Bootstrap existing rows
UPDATE "AIMemory" SET "verificationStatus" = 'trusted' WHERE "pinned" = true AND "archived" = false;
UPDATE "AIMemory" SET "verificationStatus" = 'verified', "verifiedAt" = "updatedAt", "verifiedBy" = 'system' WHERE "verified" = true AND "verificationStatus" = 'pending';
UPDATE "AIMemory" SET "verificationStatus" = 'archived' WHERE "archived" = true;
