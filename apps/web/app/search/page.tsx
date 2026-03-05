"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getCategoryCatalog,
  SearchFilters,
  semanticSearchListingsWithFilters,
  searchListingsWithFilters
} from "../../lib/api";
import {
  BLOCKED_SELLERS_CHANGED_EVENT,
  getBlockedSellerIdsLocal
} from "../../lib/listing-preferences";
import { resolveMediaUrl } from "../../lib/media-url";
import { Listing, MarketplaceCategory } from "../../lib/types";

const conditions = ["ANY", "NEW", "USED"];
const sortOptions = [
  { value: "relevance", label: "Best Match" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "date_desc", label: "Date Posted: Newest" },
  { value: "date_asc", label: "Date Posted: Oldest" }
] as const;
type SortBy = (typeof sortOptions)[number]["value"];

function parsePositiveNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return NaN;
  }
  return n;
}

function SearchSkeletonList() {
  return (
    <div className="searchResultsList" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="searchResultCard skeletonCard" key={index}>
          <div className="searchResultImage shimmer" />
          <div className="searchResultBody">
            <div className="skeletonLine shimmer w40" />
            <div className="skeletonLine shimmer w90" />
            <div className="skeletonLine shimmer w60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("ANY");
  const [negotiableOnly, setNegotiableOnly] = useState(false);
  const [catalog, setCatalog] = useState<MarketplaceCategory[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [blockedSellerIds, setBlockedSellerIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");

  const suggestedTags = useMemo(() => catalog.slice(0, 8), [catalog]);
  const filteredResults = useMemo(
    () =>
      results.filter((listing) => {
        const sellerId = listing.user?.id;
        return !sellerId || !blockedSellerIds.includes(sellerId);
      }),
    [blockedSellerIds, results]
  );

  useEffect(() => {
    void getCategoryCatalog().then(setCatalog).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const apply = () => setBlockedSellerIds(getBlockedSellerIdsLocal());
    apply();
    window.addEventListener(BLOCKED_SELLERS_CHANGED_EVENT, apply);
    return () => window.removeEventListener(BLOCKED_SELLERS_CHANGED_EVENT, apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get("q") ?? "";
    const initialCategory = params.get("category") ?? "";
    const initialSubcategory = params.get("subcategory") ?? "";
    const initialCity = params.get("city") ?? "";
    const initialArea = params.get("area") ?? "";
    const initialMinPrice = params.get("minPrice") ?? "";
    const initialMaxPrice = params.get("maxPrice") ?? "";
    const initialCondition = params.get("condition") ?? "ANY";
    const initialNegotiable = params.get("negotiable") === "true";
    const initialSortBy = (params.get("sortBy") as SortBy | null) ?? "relevance";
    const resolvedCategory = initialSubcategory || initialCategory;
    if (initialQ) {
      setQuery(initialQ);
    }
    if (resolvedCategory) {
      setCategory(resolvedCategory);
    }
    if (initialCity) {
      setCity(initialCity);
    }
    if (initialArea) {
      setArea(initialArea);
    }
    if (initialMinPrice) {
      setMinPrice(initialMinPrice);
    }
    if (initialMaxPrice) {
      setMaxPrice(initialMaxPrice);
    }
    if (initialCondition && conditions.includes(initialCondition)) {
      setCondition(initialCondition);
    }
    if (initialNegotiable) {
      setNegotiableOnly(true);
    }
    setSortBy(sortOptions.some((item) => item.value === initialSortBy) ? initialSortBy : "relevance");
    const parsedInitialMin = parsePositiveNumber(initialMinPrice);
    const parsedInitialMax = parsePositiveNumber(initialMaxPrice);

    if (
      initialQ ||
      resolvedCategory ||
      initialCity ||
      initialArea ||
      initialMinPrice ||
      initialMaxPrice ||
      initialNegotiable
    ) {
      void runSearchWith({
        query: initialQ,
        category: resolvedCategory,
        city: initialCity,
        area: initialArea,
        minPrice: Number.isNaN(parsedInitialMin) ? undefined : parsedInitialMin,
        maxPrice: Number.isNaN(parsedInitialMax) ? undefined : parsedInitialMax,
        condition: conditions.includes(initialCondition) ? initialCondition : "ANY",
        negotiable: initialNegotiable,
        sortBy: sortOptions.some((item) => item.value === initialSortBy) ? initialSortBy : "relevance",
        limit: 100
      });
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chips = useMemo(() => {
    const list: string[] = [];
    if (query.trim()) list.push(`"${query.trim()}"`);
    if (category) {
      const matchedRoot = catalog.find((item) => item.slug === category);
      const matchedSub = catalog
        .flatMap((item) => item.subcategories)
        .find((item) => item.slug === category);
      list.push(matchedSub?.name ?? matchedRoot?.name ?? category);
    }
    if (city.trim()) list.push(city.trim());
    if (area.trim()) list.push(area.trim());
    if (minPrice.trim()) list.push(`Min ${minPrice}`);
    if (maxPrice.trim()) list.push(`Max ${maxPrice}`);
    if (condition !== "ANY") list.push(condition);
    if (negotiableOnly) list.push("Negotiable Only");
    const sortLabel = sortOptions.find((item) => item.value === sortBy)?.label ?? "Best Match";
    list.push(sortLabel);
    return list;
  }, [area, catalog, category, city, condition, maxPrice, minPrice, negotiableOnly, query, sortBy]);

  function updateUrlFromSearch(payload: SearchFilters) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();
    const cleanQuery = payload.query.trim();
    const cleanCategory = payload.category.trim();
    const cleanCity = payload.city.trim();
    const cleanArea = payload.area?.trim() ?? "";

    if (cleanQuery) {
      params.set("q", cleanQuery);
    }
    if (cleanCategory) {
      params.set("category", cleanCategory);
    }
    if (cleanCity) {
      params.set("city", cleanCity);
    }
    if (cleanArea) {
      params.set("area", cleanArea);
    }
    if (typeof payload.minPrice === "number") {
      params.set("minPrice", String(payload.minPrice));
    }
    if (typeof payload.maxPrice === "number") {
      params.set("maxPrice", String(payload.maxPrice));
    }
    if (payload.condition && payload.condition !== "ANY") {
      params.set("condition", payload.condition);
    }
    if (typeof payload.negotiable === "boolean") {
      params.set("negotiable", String(payload.negotiable));
    }
    if (payload.sortBy && payload.sortBy !== "relevance") {
      params.set("sortBy", payload.sortBy);
    }

    const url = params.toString() ? `/search?${params.toString()}` : "/search";
    window.history.replaceState({}, "", url);
  }

  async function runSearchWith(payload: SearchFilters) {
    setLoading(true);
    setError("");
    try {
      let data: Listing[] = [];
      try {
        data = await semanticSearchListingsWithFilters(payload);
      } catch {
        data = await searchListingsWithFilters(payload);
      }

      setResults(data);
      setMobileFiltersOpen(false);
      setHasSubmitted(true);
      updateUrlFromSearch(payload);
    } catch {
      setError("Search request fail ho gayi. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setHasSubmitted(true);

    const min = parsePositiveNumber(minPrice);
    const max = parsePositiveNumber(maxPrice);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      setError("Price values numeric aur positive honi chahiye.");
      return;
    }
    if (typeof min === "number" && typeof max === "number" && min > max) {
      setError("Min price max price se bari nahi ho sakti.");
      return;
    }

    const payload: SearchFilters = {
      query,
      category,
      city,
      area,
      minPrice: min,
      maxPrice: max,
      condition,
      negotiable: negotiableOnly,
      sortBy,
      limit: 100
    };

    await runSearchWith(payload);
  }

  return (
    <main className="searchScreen">
      <section className="searchHeader">
        <h1>Dhundo</h1>
        <p>Category, sub-category, city aur price filters ke saath targeted search karein.</p>
      </section>

      <div className="searchLayout">
        <aside className="searchFilters desktopOnly">
          <form className="stack" onSubmit={runSearch}>
            <label className="filterLabel">
              Keyword
              <input
                className="input"
                placeholder="e.g. iPhone 15"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="filterLabel">
              Sort By
              <select
                className="input"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
              >
                {sortOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filterLabel">
              Category / Subcategory
              <select
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All Categories</option>
                {catalog.map((root) => (
                  <optgroup key={root.id} label={root.name}>
                    <option value={root.slug}>{root.name} (All)</option>
                    {root.subcategories.map((sub) => (
                      <option value={sub.slug} key={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="filterLabel">
              City
              <input
                className="input"
                placeholder="Karachi"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </label>
            <label className="filterLabel">
              Area
              <input
                className="input"
                placeholder="Johar Town, DHA..."
                value={area}
                onChange={(event) => setArea(event.target.value)}
              />
            </label>
            <div className="priceRow">
              <label className="filterLabel">
                Min Price
                <input
                  className="input"
                  inputMode="numeric"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>
              <label className="filterLabel">
                Max Price
                <input
                  className="input"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </div>
            <label className="filterLabel">
              Condition
              <select
                className="input"
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
              >
                {conditions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={negotiableOnly}
                onChange={(event) => setNegotiableOnly(event.target.checked)}
              />
              <span>Negotiable Only</span>
            </label>
            <button className="searchSubmitBtn" type="submit" disabled={loading}>
              Apply Filters
            </button>
          </form>
        </aside>

        <section className="searchResults">
          <div className="mobileFiltersBar mobileOnly">
            <button
              className="searchSubmitBtn ghost"
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
            >
              Open Filters
            </button>
          </div>

          <div className="search-tags">
            <span className="search-tag-label">Popular Categories</span>
            {suggestedTags.map((item) => (
              <button
                className="search-tag"
                key={item.id}
                type="button"
              onClick={() => {
                const parsedMin = parsePositiveNumber(minPrice);
                const parsedMax = parsePositiveNumber(maxPrice);
                setCategory(item.slug);
                void runSearchWith({
                  query,
                  category: item.slug,
                  city,
                  area,
                  minPrice: Number.isNaN(parsedMin) ? undefined : parsedMin,
                  maxPrice: Number.isNaN(parsedMax) ? undefined : parsedMax,
                  condition,
                  negotiable: negotiableOnly,
                  sortBy,
                  limit: 100
                });
              }}
              >
                {item.icon} {item.name}
              </button>
            ))}
          </div>

          <div className="filterChips">
            {chips.map((chip) => (
              <span className="filterChip" key={chip}>
                {chip}
              </span>
            ))}
          </div>

          {error ? (
            <div className="searchErrorBanner" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? <SearchSkeletonList /> : null}

          {!loading && hasSubmitted && !error && filteredResults.length === 0 ? (
            <div className="searchStateEmpty">
              <div className="emptyIllustration" aria-hidden="true" />
              <p>No results</p>
            </div>
          ) : null}

          {!loading && filteredResults.length > 0 ? (
            <div className="searchResultsList">
              {filteredResults.map((listing) => (
                <Link className="searchResultCard" key={listing.id} href={`/listing/${listing.id}`}>
                  {resolveMediaUrl(listing.media.find((item) => item.type === "IMAGE")?.url ?? "") ? (
                    <img
                      className="searchResultImage"
                      src={resolveMediaUrl(listing.media.find((item) => item.type === "IMAGE")?.url ?? "")}
                      alt={listing.title}
                    />
                  ) : (
                    <div className="searchResultImagePlaceholder" aria-hidden="true" />
                  )}
                  <div className="searchResultBody">
                    <p className="searchResultPrice">
                      {listing.currency} {listing.price}
                    </p>
                    <h3>{listing.title}</h3>
                    <p className="searchResultMeta">
                      {(listing.city || "Pakistan") +
                        (listing.exactLocation ? ` - ${listing.exactLocation}` : "") +
                        ` - ${listing.status}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {mobileFiltersOpen ? (
        <div className="mobileSheetBackdrop mobileOnly" onClick={() => setMobileFiltersOpen(false)}>
          <aside
            className="mobileFilterSheet"
            onClick={(event) => event.stopPropagation()}
            aria-label="Search filters"
          >
            <form className="stack" onSubmit={runSearch}>
              <div className="sheetHeader">
                <h2>Filters</h2>
                <button
                  type="button"
                  className="searchSubmitBtn ghost"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  Close
                </button>
              </div>
              <label className="filterLabel">
                Keyword
                <input
                  className="input"
                  placeholder="e.g. iPhone 15"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="filterLabel">
                Sort By
                <select
                  className="input"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                >
                  {sortOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filterLabel">
                Category / Subcategory
                <select
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">All Categories</option>
                  {catalog.map((root) => (
                    <optgroup key={root.id} label={root.name}>
                      <option value={root.slug}>{root.name} (All)</option>
                      {root.subcategories.map((sub) => (
                        <option value={sub.slug} key={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="filterLabel">
                City
                <input
                  className="input"
                  placeholder="Karachi"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
              <label className="filterLabel">
                Area
                <input
                  className="input"
                  placeholder="Johar Town, DHA..."
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                />
              </label>
              <div className="priceRow">
                <label className="filterLabel">
                  Min Price
                  <input
                    className="input"
                    inputMode="numeric"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                  />
                </label>
                <label className="filterLabel">
                  Max Price
                  <input
                    className="input"
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                  />
                </label>
              </div>
              <label className="filterLabel">
                Condition
                <select
                  className="input"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                >
                  {conditions.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={negotiableOnly}
                  onChange={(event) => setNegotiableOnly(event.target.checked)}
                />
                <span>Negotiable Only</span>
              </label>
              <button className="searchSubmitBtn" type="submit" disabled={loading}>
                Apply Filters
              </button>
            </form>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
