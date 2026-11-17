-- Normalize any pre-existing overlap before the API begins enforcing one open volume.
-- Keep the newest numbered volume open; preserve all applications on their original volume.
WITH ranked_open_volumes AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      ORDER BY "volumeNumber" DESC, "updatedAt" DESC, "id" DESC
    ) AS "openRank"
  FROM "SessionVolume"
  WHERE "status" = 'applications_open'
)
UPDATE "SessionVolume"
SET
  "status" = 'applications_closed',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN (
  SELECT "id"
  FROM ranked_open_volumes
  WHERE "openRank" > 1
);
