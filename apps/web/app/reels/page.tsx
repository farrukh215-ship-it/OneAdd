"use client";

import { useEffect, useMemo, useState } from "react";
import { getFeedListings } from "../../lib/api";
import { Listing } from "../../lib/types";

export default function ReelsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeedListings()
      .then((data) => setItems(data))
      .catch(() => setError("Failed to load reels."));
  }, []);

  const reels = useMemo(
    () =>
      items.filter((item) =>
        item.media.some((media) => media.type === "VIDEO" && (media.durationSec ?? 0) <= 30)
      ),
    [items]
  );

  return (
    <main className="reelsScreen">
      {error && <p className="error">{error}</p>}
      {reels.map((listing) => {
        const video = listing.media.find((item) => item.type === "VIDEO");
        if (!video) {
          return null;
        }
        return (
          <section className="reelCard" key={listing.id}>
            <video className="reelVideo" src={video.url} controls loop />
            <div className="reelOverlay">
              <h2>{listing.title}</h2>
              <p>
                {listing.currency} {listing.price}
              </p>
            </div>
          </section>
        );
      })}
    </main>
  );
}
