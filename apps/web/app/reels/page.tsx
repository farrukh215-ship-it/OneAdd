"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getVideoFeed, VideoFeedItem } from "../../lib/api";
import {
  getSavedListingIdsLocal,
  toggleSavedListingPreference
} from "../../lib/listing-preferences";
import { useAuthToken } from "../../lib/use-auth-token";

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
  const [pausedByUser, setPausedByUser] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const { mounted, token } = useAuthToken();
  const isLoggedIn = mounted && Boolean(token);

  useEffect(() => {
    setSaved(getSavedListingIdsLocal().includes(item.listingId));
  }, [item.listingId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = muted;
    if (isActive && !pausedByUser) {
      video.play().catch(() => undefined);
      return;
    }
    video.pause();
  }, [isActive, muted, pausedByUser]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const onTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, video.currentTime / video.duration)));
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onTimeUpdate);
    };
  }, []);

  function toggleSave() {
    void toggleSavedListingPreference(item.listingId, isLoggedIn).then(setSaved);
  }

  async function shareListing() {
    const url = `${window.location.origin}/listing/${item.listingId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
  }

  function togglePause() {
    setPausedByUser((prev) => !prev);
  }

  return (
    <section className="reelUnit">
      <video
        ref={videoRef}
        className="reelVideoSurface"
        src={item.videoUrl}
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={togglePause}
      />
      <div className="reelProgressTrack" aria-hidden="true">
        <div className="reelProgressBar" style={{ width: `${progress * 100}%` }} />
      </div>
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
          <button className="reelActionBtn ghost" type="button" onClick={toggleSave}>
            {saved ? "Saved" : "Save"}
          </button>
          <button className="reelActionBtn ghost" type="button" onClick={() => setMuted((prev) => !prev)}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button className="reelActionBtn ghost" type="button" onClick={togglePause}>
            {pausedByUser ? "Play" : "Pause"}
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
          <Link href="/sell" className="reelActionBtn">
            Upload First Reel
          </Link>
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

  return (
    <main className="premiumReelsScreen">
      <div className="reelsTopActions">
        <Link href="/sell" className="reelActionBtn">
          Upload Reel
        </Link>
      </div>
      {body}
    </main>
  );
}
