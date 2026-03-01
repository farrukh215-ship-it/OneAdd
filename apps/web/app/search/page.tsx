"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { SearchFilters, searchListingsWithFilters } from "../../lib/api";
import { Listing } from "../../lib/types";

const categories = [
  "Mobiles",
  "Vehicles",
  "Property",
  "Electronics",
  "Fashion",
  "Home"
];

const conditions = ["ANY", "NEW", "USED"];

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
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [condition, setCondition] = useState("ANY");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const chips = useMemo(() => {
    const list: string[] = [];
    if (query.trim()) list.push(`"${query.trim()}"`);
    if (category) list.push(category);
    if (city.trim()) list.push(city.trim());
    if (minPrice.trim()) list.push(`Min ${minPrice}`);
    if (maxPrice.trim()) list.push(`Max ${maxPrice}`);
    if (condition !== "ANY") list.push(condition);
    return list;
  }, [category, city, condition, maxPrice, minPrice, query]);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setError("");
    setHasSubmitted(true);

    if (!category) {
      setError("Category select karna zaroori hai.");
      return;
    }

    const min = parsePositiveNumber(minPrice);
    const max = parsePositiveNumber(maxPrice);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      setError("Price values numeric aur positive honi chahiye.");
      return;
    }
    if (
      typeof min === "number" &&
      typeof max === "number" &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min > max
    ) {
      setError("Min price max price se bari nahi ho sakti.");
      return;
    }

    const payload: SearchFilters = {
      query,
      category,
      city,
      minPrice: min,
      maxPrice: max,
      condition
    };

    setLoading(true);
    try {
      const data = await searchListingsWithFilters(payload);
      setResults(data);
      setMobileFiltersOpen(false);
    } catch {
      setError("Search request fail ho gayi. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="searchScreen">
      <section className="searchHeader">
        <h1>Search Results</h1>
        <p>Keyword, city aur filters se refined listings dekhein.</p>
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
              Category
              <select
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
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

          {!loading && hasSubmitted && !error && results.length === 0 ? (
            <div className="searchStateEmpty">
              <div className="emptyIllustration" aria-hidden="true" />
              <p>No results</p>
            </div>
          ) : null}

          {!loading && results.length > 0 ? (
            <div className="searchResultsList">
              {results.map((listing) => (
                <Link className="searchResultCard" key={listing.id} href={`/listing/${listing.id}`}>
                  {listing.media.find((item) => item.type === "IMAGE")?.url ? (
                    <img
                      className="searchResultImage"
                      src={listing.media.find((item) => item.type === "IMAGE")?.url}
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
                      {listing.city || "Pakistan"} · {listing.status}
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
                <button type="button" className="searchSubmitBtn ghost" onClick={() => setMobileFiltersOpen(false)}>
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
                Category
                <select
                  className="input"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
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
