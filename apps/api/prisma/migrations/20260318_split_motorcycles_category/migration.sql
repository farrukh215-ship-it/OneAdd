-- Ensure dedicated top-level motorcycles category exists
INSERT INTO "Category" ("id", "name", "slug", "icon", "order")
VALUES ('motorcycles-seed', 'Motorcycles', 'motorcycles', '🏍️', 6)
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "icon" = EXCLUDED."icon",
    "order" = EXCLUDED."order";

-- Keep cycles category right after motorcycles
UPDATE "Category"
SET "order" = 7
WHERE "slug" = 'cycles';

-- Normalize cars category order
UPDATE "Category"
SET "order" = 2
WHERE "slug" = 'cars';

-- Remap old motorcycle-like listings from cycles -> motorcycles
WITH motorcycles_category AS (
  SELECT id FROM "Category" WHERE "slug" = 'motorcycles' LIMIT 1
)
UPDATE "Listing" l
SET
  "categoryId" = m.id,
  "subcategorySlug" = CASE
    WHEN l."subcategorySlug" = 'motorcycles' THEN 'standard-bikes'
    WHEN l."subcategorySlug" = 'scooters' THEN 'scooters'
    WHEN l."subcategorySlug" = 'electric-bikes' THEN 'electric-motorcycles'
    WHEN l."subcategorySlug" = 'bike-spare-parts' THEN 'motorcycle-spare-parts'
    WHEN l."subcategorySlug" = 'bike-accessories' THEN 'motorcycle-accessories'
    ELSE l."subcategorySlug"
  END,
  "subcategoryName" = CASE
    WHEN l."subcategorySlug" = 'motorcycles' THEN 'Standard Bikes'
    WHEN l."subcategorySlug" = 'scooters' THEN 'Scooters'
    WHEN l."subcategorySlug" = 'electric-bikes' THEN 'Electric Motorcycles'
    WHEN l."subcategorySlug" = 'bike-spare-parts' THEN 'Motorcycle Spare Parts'
    WHEN l."subcategorySlug" = 'bike-accessories' THEN 'Motorcycle Accessories'
    ELSE l."subcategoryName"
  END
FROM motorcycles_category m
WHERE l."subcategorySlug" IN (
  'motorcycles',
  'scooters',
  'electric-bikes',
  'bike-spare-parts',
  'bike-accessories'
);
