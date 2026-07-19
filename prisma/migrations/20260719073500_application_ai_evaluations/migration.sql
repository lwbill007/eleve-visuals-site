CREATE TABLE IF NOT EXISTS "ApplicationEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "volumeId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationEvaluation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ApplicationEvaluation_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationEvaluation_submissionId_key"
  ON "ApplicationEvaluation"("submissionId");
CREATE INDEX IF NOT EXISTS "ApplicationEvaluation_volumeId_rank_idx"
  ON "ApplicationEvaluation"("volumeId", "rank");
CREATE INDEX IF NOT EXISTS "ApplicationEvaluation_evaluatedAt_idx"
  ON "ApplicationEvaluation"("evaluatedAt");
