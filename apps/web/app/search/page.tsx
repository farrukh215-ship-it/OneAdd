"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchListings } from "../../lib/api";
import { Listing } from "../../lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await searchListings(query.trim());
        setResults(data);
      } catch {
        setError("Search failed.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  return (
    <main className="screen">
      <section className="panel">
        <h1>Search</h1>
        <input
          className="input"
          placeholder="Search by title or keyword"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>
      {loading && <p>Searching...</p>}
      {error && <p className="error">{error}</p>}
      <section className="grid">
        {results.map((listing) => (
          <Link className="listingCard" key={listing.id} href={`/listing/${listing.id}`}>
            <p className="listingTitle">{listing.title}</p>
            <p className="listingMeta">
              {listing.currency} {listing.price}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
