"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { getCategoryCatalog, getRecentListingsPage } from "../lib/api";
import {
  getSavedListingIdsLocal,
  resolveListingsByIds,
  syncRecentlyViewedListings,
  syncSavedListings,
  toggleSavedListingPreference
} from "../lib/listing-preferences";
import { resolveMediaUrl } from "../lib/media-url";
import { Listing, MarketplaceCategory } from "../lib/types";
import { useAuthToken } from "../lib/use-auth-token";

const INITIAL_SKELETON_COUNT = 8;
const urduTagline =
  "\u062A\u06CC\u0631\u0627 \u062F\u0644 \u06A9\u0627 \u0633\u0627\u0645\u0627\u0646 - \u0645\u06CC\u0631\u06D2 \u06AF\u06BE\u0631 \u06A9\u0627 \u062D\u0635\u06C1";
const quickFilters = ["Latest", "Verified", "Karachi", "Lahore", "Islamabad", "Under 50K"];

type HeroCard = {
  listingId?: string;
  imageUrl?: string;
  icon: string;
  title: string;
  desc: string;
  city: string;
  price: string;
  createdAt?: string;
};

const heroFallback: HeroCard[] = [
  {
    icon: "\ud83d\udcf1",
    title: "iPhone 13 - 128GB PTA",
    desc: "Scratch-less, box available",
    city: "Karachi",
    price: "PKR 132,000"
  },
  {
    icon: "\ud83d\udecb\ufe0f",
    title: "7 Seater Sofa Set",
    desc: "Good condition, urgent sale",
    city: "Lahore",
    price: "PKR 48,000"
  },
  {
    icon: "\ud83d\udcfa",
    title: "Sony 55 inch 4K TV",
    desc: "Perfect panel, no repair",
    city: "Islamabad",
    price: "PKR 135,000"
  }
];

function getPrimaryImage(listing: Listing) {
  const url = listing.media.find((item) => item.type === "IMAGE")?.url ?? "";
  return resolveMediaUrl(url);
}

function toRelativeTime(timestamp?: string) {
  if (!timestamp) {
    return "Just now";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function toListedDate(timestamp?: string) {
  if (!timestamp) {
    return "Listed recently";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Listed recently";
  }
  return `Listed on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })}`;
}

function toLastOnline(timestamp?: string | null) {
  if (!timestamp) {
    return "Last online recently";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Last online recently";
  }
  return `Seller online ${toRelativeTime(timestamp)}`;
}

function dedupeById(listings: Listing[]) {
  const seen = new Set<string>();
  const unique: Listing[] = [];
  for (const item of listings) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function heroCardsFromListings(listings: Listing[]) {
  const fromListings: HeroCard[] = listings.slice(0, 3).map((item) => ({
    listingId: item.id,
    imageUrl: getPrimaryImage(item),
    icon: "\ud83c\udfe1",
    title: item.title,
    desc: item.description,
    city: item.city || "Pakistan",
    price: `${item.currency} ${item.price}`,
    createdAt: item.createdAt
  }));

  if (fromListings.length < 3) {
    return [...fromListings, ...heroFallback.slice(fromListings.length)];
  }
  return fromListings;
}

type ListingCardProps = {
  listing: Listing;
};

function ListingCard({ listing }: ListingCardProps) {
  const images = useMemo(
    () => listing.media.filter((item) => item.type === "IMAGE"),
    [listing.media]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImageIndexes, setFailedImageIndexes] = useState<Set<number>>(new Set());
  const visibleImageIndexes = useMemo(
    () => images.map((_, index) => index).filter((index) => !failedImageIndexes.has(index)),
    [failedImageIndexes, images]
  );
  const activeOriginalImageIndex = visibleImageIndexes[activeImageIndex];
  const image =
    activeOriginalImageIndex !== undefined
      ? resolveMediaUrl(images[activeOriginalImageIndex]?.url ?? "")
      : "";
  const condition = (listing.status || "USED").replace(/_/g, " ");
  const trustScore = listing.user?.trustScore?.score ?? 0;
  const responseBadge =
    trustScore >= 80 ? "Replies < 10m" : trustScore >= 60 ? "Replies < 30m" : "Replies < 2h";
  const [saved, setSaved] = useState(false);
  const { mounted, token } = useAuthToken();
  const isLoggedIn = mounted && Boolean(token);

  useEffect(() => {
    setSaved(getSavedListingIdsLocal().includes(listing.id));
  }, [listing.id]);

  function toggleSaved(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void toggleSavedListingPreference(listing.id, isLoggedIn).then(setSaved);
  }

  function goToPrevImage(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImageIndex((prev) => (prev <= 0 ? visibleImageIndexes.length - 1 : prev - 1));
  }

  function goToNextImage(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % visibleImageIndexes.length);
  }

  useEffect(() => {
    setActiveImageIndex(0);
    setFailedImageIndexes(new Set());
  }, [listing.id]);

  useEffect(() => {
    if (activeImageIndex >= visibleImageIndexes.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, visibleImageIndexes.length]);

  return (
    <Link className="listing-card" href={`/listing/${listing.id}`}>
      <div className="listing-img">
        <span className="listing-condition">{condition}</span>
        <button
          className="listing-save"
          aria-label={saved ? "Unsave listing" : "Save listing"}
          onClick={toggleSaved}
          type="button"
        >
          {saved ? "\u2665" : "\u2661"}
        </button>
        <div className="listing-img-inner">
          {image ? (
            <img
              className="premiumMedia"
              src={image}
              alt={listing.title}
              loading="lazy"
              onError={() => {
                if (activeOriginalImageIndex === undefined) {
                  return;
                }
                setFailedImageIndexes((prev) => {
                  if (prev.has(activeOriginalImageIndex)) {
                    return prev;
                  }
                  const next = new Set(prev);
                  next.add(activeOriginalImageIndex);
                  return next;
                });
              }}
            />
          ) : (
            <div className="listingImagePlaceholder" aria-hidden="true" />
          )}
        </div>
        {visibleImageIndexes.length > 1 ? (
          <div className="listingSlideControls">
            <button className="listingSlideBtn" onClick={goToPrevImage} type="button">
              ‹
            </button>
            <button className="listingSlideBtn" onClick={goToNextImage} type="button">
              ›
            </button>
          </div>
        ) : null}
      </div>
      <div className="listing-body">
        <p className="listing-cat">TGMG Verified</p>
        <h3 className="listing-title">{listing.title}</h3>
        <p className="listing-desc">{listing.description}</p>
        <p className="listing-price">
          {listing.currency} {listing.price}
          <span>{listing.isNegotiable ? " / negotiable" : " / fixed"}</span>
        </p>
        <div className="listing-footer">
          <span className="listing-loc">{listing.city || "Pakistan"}</span>
          <span className="badge-verified">Asli Banda</span>
        </div>
        <p className="listing-desc">{responseBadge}</p>
        <p className="listing-desc">{toListedDate(listing.createdAt)}</p>
        <p className="listing-desc">{toLastOnline(listing.user?.lastSeenAt)}</p>
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="listings-grid" aria-hidden="true">
      {Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
        <div className="listing-card skeletonCard" key={index}>
          <div className="skeletonMedia shimmer" />
          <div className="listing-body">
            <div className="skeletonLine shimmer w40" />
            <div className="skeletonLine shimmer w90" />
            <div className="skeletonLine shimmer w60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function categoryHref(slug: string) {
  return `/search?category=${encodeURIComponent(slug)}`;
}

export function HomeFeed() {
  const { mounted, token } = useAuthToken();
  const isLoggedIn = mounted && Boolean(token);
  const [items, setItems] = useState<Listing[]>([]);
  const [recentItems, setRecentItems] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore = !loading && !loadingMore && Boolean(cursor);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === selectedCategorySlug) ?? categories[0] ?? null,
    [categories, selectedCategorySlug]
  );

  async function loadCategories() {
    try {
      const catalog = await getCategoryCatalog();
      setCategories(catalog);
      if (catalog.length > 0) {
        setSelectedCategorySlug((prev) => prev || catalog[0].slug);
      }
    } catch {
      // API has its own fallback catalog.
    }
  }

  async function loadInitial() {
    setLoading(true);
    setError("");
    try {
      const page = await getRecentListingsPage(null);
      setItems(dedupeById(page.items));
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
      setItems((prev) => dedupeById([...prev, ...page.items]));
      setCursor(page.nextCursor);
    } catch {
      setError("Could not load more listings.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    void (async () => {
      await syncSavedListings(isLoggedIn);
      const recentIds = await syncRecentlyViewedListings(isLoggedIn);
      const resolved = await resolveListingsByIds(recentIds.slice(0, 6), items);
      setRecentItems(dedupeById(resolved));
    })();
  }, [isLoggedIn, items, mounted]);

  useEffect(() => {
    if (!canLoadMore || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "300px 0px 300px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, cursor]);

  const dedupedRecentItems = useMemo(() => dedupeById(recentItems), [recentItems]);
  const heroSourceListings = useMemo(
    () => dedupeById([...items, ...dedupedRecentItems]),
    [dedupedRecentItems, items]
  );
  const heroCards = useMemo(() => heroCardsFromListings(heroSourceListings), [heroSourceListings]);
  const heroListingIds = useMemo(
    () => new Set(heroCards.map((item) => item.listingId).filter(Boolean)),
    [heroCards]
  );
  const recentListingIds = useMemo(
    () => new Set(dedupedRecentItems.map((item) => item.id)),
    [dedupedRecentItems]
  );
  const latestItems = useMemo(
    () => items.filter((item) => !heroListingIds.has(item.id) && !recentListingIds.has(item.id)),
    [heroListingIds, items, recentListingIds]
  );

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("q") || "").trim();
    if (query) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
      return;
    }
    window.location.href = "/search";
  }

  const listingSectionBody = useMemo(() => {
    if (loading) {
      return <FeedSkeleton />;
    }

    if (error && items.length === 0) {
      return (
        <div className="feedStateCard" role="alert">
          <p>Listings load nahi sakin.</p>
          <button className="search-btn" onClick={() => void loadInitial()} type="button">
            Dobara Try Karein
          </button>
        </div>
      );
    }

    const shouldShowEmpty = hasLoadedOnce && latestItems.length === 0 && !loading && !error;
    if (shouldShowEmpty) {
      return (
        <div className="feedStateCard">
          <div className="emptyIllustration" aria-hidden="true" />
          <p>No listings yet</p>
        </div>
      );
    }

    return (
      <>
        <div className="listings-grid">
          {latestItems.map((listing) => (
            <ListingCard listing={listing} key={listing.id} />
          ))}
        </div>
        {loadingMore ? <FeedSkeleton /> : null}
      </>
    );
  }, [error, hasLoadedOnce, latestItems, loading, loadingMore]);

  return (
    <>
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>Live Marketplace - Pakistan</span>
          </div>

          <h1 className="hero-heading">
            Tera <em>Ghar</em> Mera Ghar
          </h1>

          <p className="hero-urdu urdu-text">{urduTagline}</p>
          <p className="hero-desc">
            Pakistan ka pehla real-person used marketplace. <strong>Shopkeepers aur showroom
            owners ki duplicate ADDs block,</strong> sirf real household seller ko priority.
          </p>

          <div className="hero-actions">
            <Link href="/sell" className="btn-hero-primary">
              {"\ud83c\udfe0"} Apna Saaman Becho
            </Link>
            <Link href="/search" className="btn-hero-secondary">
              {"\ud83d\udd0d"} Dhundo
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-num">100%</div>
              <div className="stat-label">Real Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">1 Add</div>
              <div className="stat-label">Per Person</div>
            </div>
            <div className="stat-item">
              <div className="stat-num">PK</div>
              <div className="stat-label">Local First</div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-logo-panel">
            <Image
              src="/brand/tgmg-full.png"
              alt="TGMG"
              width={350}
              height={196}
              className="hero-full-logo"
              priority
            />
          </div>
          {heroCards.map((item, index) => (
            <article className="hero-card" key={`${item.title}-${index}`}>
              <div className="hcard-header">
                <div className="hcard-img" aria-hidden="true">
                  {item.imageUrl ? (
                    <>
                      <img
                        className="hcard-img-media"
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) {
                            fallback.style.display = "flex";
                          }
                        }}
                      />
                      <span className="hcard-img-fallback">{item.icon}</span>
                    </>
                  ) : (
                    item.icon
                  )}
                </div>
                <div className="hcard-meta">
                  <h3 className="hcard-title">{item.title}</h3>
                  <p className="hcard-desc">{item.desc}</p>
                  <p className="hcard-location">{item.city}</p>
                </div>
                <p className="hcard-price">{item.price}</p>
              </div>
              <div className="hcard-footer">
                <span className="badge-verified">Asli Banda</span>
                <span className="hcard-time">{toRelativeTime(item.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="trust-bar">
        <div className="trust-item">
          <span className="trust-icon">{"\u2705"}</span>
          <span className="trust-text">CNIC Verified People</span>
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          <span className="trust-icon">{"\ud83d\udeab"}</span>
          <span className="trust-text">Shopkeeper Spam Blocked</span>
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          <span className="trust-icon">{"1\ufe0f\u20e3"}</span>
          <span className="trust-text">Ek Banda Ek ADD</span>
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          <span className="trust-icon">{"\ud83c\udfe1"}</span>
          <span className="trust-text">Sirf Ghar Ka Saaman</span>
        </div>
        <div className="trust-sep" />
        <div className="trust-item">
          <span className="trust-icon">{"\ud83c\uddf5\ud83c\uddf0"}</span>
          <span className="trust-text">Made for Pakistan</span>
        </div>
      </div>

      <section className="search-section">
        <form className="search-box" onSubmit={onSearchSubmit}>
          <span className="search-icon" aria-hidden="true">
            {"\ud83d\udd0d"}
          </span>
          <input
            className="search-input"
            name="q"
            placeholder="Kya dhoond rahe ho? iPhone, Sofa, Fridge..."
          />
          <span className="search-divider" />
          <div className="search-location">
            <span aria-hidden="true">{"\ud83d\udccd"}</span>
            Pakistan
          </div>
          <button className="search-btn" type="submit">
            Dhundo
          </button>
        </form>
        <div className="search-tags">
          <span className="search-tag-label">Popular</span>
          {quickFilters.map((item) => (
            <Link href="/search" className="search-tag" key={item}>
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="categories-section">
        <header className="section-header">
          <div>
            <p className="section-eyebrow">Categories</p>
            <h2 className="section-title">Apni Category Chuno</h2>
          </div>
          <Link href="/search" className="section-link">
            Sab Dekho -&gt;
          </Link>
        </header>

        <div className="cats-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`cat-card ${selectedCategory?.slug === category.slug ? "active" : ""}`}
              onClick={() => setSelectedCategorySlug(category.slug)}
              style={{ "--cat-accent": category.accent } as CSSProperties}
              type="button"
            >
              <span className="cat-emoji" aria-hidden="true">
                {category.icon}
              </span>
              <div className="cat-name">{category.name}</div>
              <div className="cat-count">{category.listingCount} Adds</div>
            </button>
          ))}
        </div>

        {selectedCategory ? (
          <div className="subcat-panel">
            <div className="subcat-header">
              <h3>{selectedCategory.name}</h3>
              <Link href={categoryHref(selectedCategory.slug)}>
                View All in {selectedCategory.name}
              </Link>
            </div>
            <div className="subcat-grid">
              {selectedCategory.subcategories.map((subcategory) => (
                <Link href={categoryHref(subcategory.slug)} key={subcategory.id} className="subcat-item">
                  <span>{subcategory.name}</span>
                  <small>{subcategory.listingCount} ADDs</small>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="listings-section">
        <header className="section-header">
          <div>
            <p className="section-eyebrow">Fresh Picks</p>
            <h2 className="section-title">Latest Listings</h2>
          </div>
          <Link href="/search" className="section-link">
            Aur Listings -&gt;
          </Link>
        </header>

        <div className="filter-bar">
          <span className="filter-label">Filters</span>
          {quickFilters.map((chip, index) => (
            <button key={chip} className={`filter-chip ${index === 0 ? "active" : ""}`} type="button">
              {chip}
            </button>
          ))}
        </div>

        {dedupedRecentItems.length > 0 ? (
          <>
            <header className="section-header compactHeader">
              <div>
                <p className="section-eyebrow">History</p>
                <h3 className="section-title">Recently Viewed</h3>
              </div>
            </header>
            <div className="listings-grid">
              {dedupedRecentItems.map((listing) => (
                <ListingCard listing={listing} key={`recent-${listing.id}`} />
              ))}
            </div>
          </>
        ) : null}

        {listingSectionBody}
        {!error ? <div ref={sentinelRef} className="feedSentinel" aria-hidden="true" /> : null}
      </section>
    </>
  );
}
