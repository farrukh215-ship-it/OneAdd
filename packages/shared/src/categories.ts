import rawCatalog from "./category-catalog.json";

export type CategoryCatalogSubcategory = {
  slug: string;
  name: string;
};

export type CategoryCatalogRoot = {
  slug: string;
  name: string;
  icon: string;
  accent: string;
  subcategories: CategoryCatalogSubcategory[];
};

export const marketplaceCategoryCatalog =
  rawCatalog as CategoryCatalogRoot[];

export function getLeafCategorySlugs() {
  return marketplaceCategoryCatalog.flatMap((root) =>
    root.subcategories.map((item) => item.slug)
  );
}

export function getRootCategorySlugs() {
  return marketplaceCategoryCatalog.map((root) => root.slug);
}
