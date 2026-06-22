-- Clear placeholder portfolio page statistics from CMS content
UPDATE "SiteContent"
SET "value" = (
  SELECT jsonb_set("value"::jsonb, '{stats}', '[]'::jsonb)::text
)
WHERE "key" = 'portfolio-page'
  AND "value"::jsonb -> 'stats' IS NOT NULL;
