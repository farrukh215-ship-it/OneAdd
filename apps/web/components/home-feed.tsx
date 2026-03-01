"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getRecentListingsPage } from "../lib/api";
import { Listing } from "../lib/types";

const INITIAL_SKELETON_COUNT = 6;

function toRelativeTime(timestamp?: string) {
  if (!timestamp) {
    return "Just now";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTrustBadge(score: number) {
  if (score >= 80) {
    return { label: "Highly Trusted", tone: "high" as const };
  }
  if (score >= 50) {
    return { label: "Trusted Seller", tone: "medium" as const };
  }
  return { label: "New Seller", tone: "low" as const };
}

function listingImageUrl(listing: Listing) {
  const preferred = listing.media.find((item) => item.type === "IMAGE");
  return preferred?.url ?? "";
}

type ListingCardProps = {
  listing: Listing;
};

function ListingCard({ listing }: ListingCardProps) {
  const trustScore = listing.user?.trustScore?.score ?? 0;
  const trustBadge = getTrustBadge(trustScore);
  const image = listingImageUrl(listing);

  return (
    <Link className="premiumCard" href={`/listing/${listing.id}`}>
      <div className="premiumMediaWrap">
        {image ? (
          <img className="premiumMedia" src={image} alt={listing.title} loading="lazy" />
        ) : (
          <div className="premiumMediaPlaceholder" aria-hidden="true" />
        )}
      </div>
      <div className="premiumCardBody">
        <div className="premiumPrice">{listing.currency} {listing.price}</div>
        <h3 className="premiumTitle">{listing.title}</h3>
        <div className="premiumMetaRow">
          <span className="premiumCity">{listing.city || "Pakistan"}</span>
          <span className="premiumDot" aria-hidden="true">•</span>
          <span>{toRelativeTime(listing.createdAt)}</span>
        </div>
        <span className={`trustPill ${trustBadge.tone}`}>{trustBadge.label}</span>
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="premiumGrid" aria-hidden="true">
      {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
        <div className="premiumCard skeletonCard" key={index}>
          <div className="skeletonMedia shimmer" />
          <div className="premiumCardBody">
            <div className="skeletonLine shimmer w40" />
            <div className="skeletonLine shimmer w90" />
            <div className="skeletonLine shimmer w60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeFeed() {
  const [items, setItems] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = hasLoadedOnce && items.length === 0 && !loading;
  const canLoadMore = !loading && !loadingMore && Boolean(cursor);

  async function loadInitial() {
    setLoading(true);
    setError("");
    try {
      const page = await getRecentListingsPage(null);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load listings right now.");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const page = await getRecentListingsPage(cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more listings.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (!canLoadMore || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px 0px 300px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, cursor]);

  const content = useMemo(() => {
    if (loading) {
      return <FeedSkeleton />;
    }

    if (error && items.length === 0) {
      return (
        <div className="feedStateCard" role="alert">
          <p>We could not load the latest listings.</p>
          <button className="retryBtn" onClick={loadInitial} type="button">
            Try Again
          </button>
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div className="feedStateCard">
          <div className="emptyIllustration" aria-hidden="true" />
          <p>No listings yet</p>
        </div>
      );
    }

    return (
      <>
        <div className="premiumGrid">
          {items.map((listing) => (
            <ListingCard listing={listing} key={listing.id} />
          ))}
        </div>
        {loadingMore ? <FeedSkeleton /> : null}
      </>
    );
  }, [error, isEmpty, items, loading, loadingMore]);

  return (
    <section className="homeFeedSection">
      <header className="homeFeedHeader">
        <div className="homeBrandLockup">
          <img src="/brand/zaroratbazar-logo-light.svg" alt="ZaroratBazar" className="homeBrandLockupImage" />
          <p className="homeBrandTagline">صرف اصل لوگ، اصل چیزیں</p>
        </div>
        <p className="feedKicker">Fresh picks</p>
        <h1>Latest Listings</h1>
      </header>
      {content}
      {!error ? <div ref={sentinelRef} className="feedSentinel" aria-hidden="true" /> : null}
    </section>
  );
}
