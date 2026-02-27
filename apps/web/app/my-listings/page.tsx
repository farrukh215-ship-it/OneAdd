"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OtpLoginCard } from "../../components/otp-login-card";
import { getMyListings, getToken } from "../../lib/api";
import { Listing } from "../../lib/types";

export default function MyListingsPage() {
  const token = getToken();
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    getMyListings()
      .then(setItems)
      .catch(() => setError("Failed to load your listings."));
  }, [token]);

  if (!token) {
    return (
      <main className="screen">
        <OtpLoginCard />
      </main>
    );
  }

  return (
    <main className="screen">
      <section className="panel">
        <h1>My Listings</h1>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          {items.map((listing) => (
            <Link className="listingCard" href={`/listing/${listing.id}`} key={listing.id}>
              <p className="listingTitle">{listing.title}</p>
              <p className="listingMeta">{listing.status}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
