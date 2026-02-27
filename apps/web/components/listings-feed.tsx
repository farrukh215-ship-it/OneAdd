"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFeedListings } from "../lib/api";
import { Listing } from "../lib/types";

type ListingsFeedProps = {
  title: string;
};

export function ListingsFeed({ title }: ListingsFeedProps) {
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeedListings()
      .then(setItems)
      .catch(() => setError("Failed to load listings."));
  }, []);

  return (
    <section className="panel">
      <h2>{title}</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {items.map((listing) => (
          <Link className="listingCard" href={`/listing/${listing.id}`} key={listing.id}>
            <p className="listingTitle">{listing.title}</p>
            <p className="listingMeta">
              {listing.currency} {listing.price}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
