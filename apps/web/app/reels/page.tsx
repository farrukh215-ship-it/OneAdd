"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getVideoFeed, VideoFeedItem } from "../../lib/api";

function ReelsLoadingState() {
  return (
    <div className="reelsLoadingList" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <article className="reelsLoadingCard" key={index}>
          <div className="reelsLoadingMedia shimmer" />
        </article>
      ))}
    </div>
  );
}

function ReelCard({ item, isActive }: { item: VideoFeedItem; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (isActive) {
      video
        .play()
        .catch(() => undefined);
      return;
    }

    video.pause();
  }, [isActive]);

  async function shareListing() {
    const url = `${window.location.origin}/listing/${item.listingId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
        return;
      } catch {
        // Fall back to clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
  }

  return (
    <section className="reelUnit">
      <video
        ref={videoRef}
        className="reelVideoSurface"
        src={item.videoUrl}
        loop
        muted
        playsInline
        preload="metadata"
      />
      <div className="reelUnitOverlay">
        <p className="reelUnitPrice">
          {item.currency} {item.price}
        </p>
        <h2 className="reelUnitTitle">{item.title}</h2>
        <div className="reelUnitActions">
          <Link href={`/listing/${item.listingId}`} className="reelActionBtn">
            View Product
          </Link>
          <button className="reelActionBtn ghost" type="button" onClick={shareListing}>
            Share
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ReelsPage() {
  const [items, setItems] = useState<VideoFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    getVideoFeed()
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch(() => setError("Reels feed load nahi ho saka."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const idx = Number((visible.target as HTMLElement).dataset.index ?? "0");
        if (!Number.isNaN(idx)) {
          setActiveIndex(idx);
        }
      },
      { threshold: [0.5, 0.75] }
    );

    sectionRefs.current.forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [items]);

  const body = useMemo(() => {
    if (loading) {
      return <ReelsLoadingState />;
    }

    if (error) {
      return <p className="error">{error}</p>;
    }

    if (items.length === 0) {
      return (
        <div className="reelsEmptyState">
          <div className="emptyIllustration" aria-hidden="true" />
          <p>No videos yet</p>
        </div>
      );
    }

    return (
      <div className="reelsFeedColumn">
        {items.map((item, index) => (
          <div
            className="reelUnitWrap"
            key={`${item.listingId}-${index}`}
            data-index={index}
            ref={(node) => {
              sectionRefs.current[index] = node;
            }}
          >
            <ReelCard item={item} isActive={activeIndex === index} />
          </div>
        ))}
      </div>
    );
  }, [activeIndex, error, items, loading]);

  return <main className="premiumReelsScreen">{body}</main>;
}

