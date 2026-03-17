UPDATE "Listing"
SET status = 'DELETED',
    "updatedAt" = NOW()
WHERE status <> 'DELETED'
  AND (
    images IS NULL
    OR cardinality(images) = 0
    OR COALESCE(images[1], '') = ''
    OR images[1] !~ '^https?://'
    OR images[1] LIKE '%localhost%'
    OR images[1] LIKE 'file:%'
  );

