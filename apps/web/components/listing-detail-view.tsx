"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareActions } from "./share-actions";
import { Listing } from "../lib/types";
import { upsertChatThread } from "../lib/api";
import { useAuthToken } from "../lib/use-auth-token";

type ListingDetailViewProps = {
  listing: Listing;
};

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const isLoggedIn = mounted && Boolean(token);

  const images = useMemo(
    () => listing.media.filter((item) => item.type === "IMAGE").slice(0, 6),
    [listing.media]
  );
  const video = useMemo(
    () =>
      listing.media.find(
        (item) => item.type === "VIDEO" && (item.durationSec ?? 0) <= 30
      ),
    [listing.media]
  );
  const [selectedImage, setSelectedImage] = useState(images[0]?.url ?? "");

  const phone = listing.user?.phone ?? "";
  const trustScore = listing.user?.trustScore?.score ?? 0;
  const trustLabel =
    trustScore >= 80 ? "Highly Trusted" : trustScore >= 50 ? "Trusted Seller" : "New Seller";

  async function startChat() {
    if (!isLoggedIn) {
      router.push(`/account?next=${encodeURIComponent(`/listing/${listing.id}`)}`);
      return;
    }

    setChatError("");
    setChatLoading(true);
    try {
      await upsertChatThread(listing.id);
      router.push("/chat");
    } catch {
      setChatError("Chat start nahi ho saki. Login check karein.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="listingDetailScreen">
      <div className="listingDetailLayout">
        <section className="listingMediaColumn">
          <div className="listingMainMedia">
            {selectedImage ? (
              <img src={selectedImage} alt={listing.title} className="listingMainImage" />
            ) : (
              <div className="listingMediaFallback" aria-hidden="true" />
            )}
          </div>

          {images.length > 1 ? (
            <div className="listingThumbRow">
              {images.map((item) => (
                <button
                  className={`listingThumb ${selectedImage === item.url ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setSelectedImage(item.url)}
                  type="button"
                >
                  <img src={item.url} alt={listing.title} />
                </button>
              ))}
            </div>
          ) : null}

          {video ? (
            <video
              src={video.url}
              className="listingVideoBlock"
              controls
              preload="metadata"
            />
          ) : null}
        </section>

        <aside className="listingInfoColumn">
          <p className="kicker">Listing</p>
          <h1 className="listingTitleMain">{listing.title}</h1>
          <p className="listingPriceMain">
            {listing.currency} {listing.price}
          </p>
          <p className="listingDescription">{listing.description}</p>

          <section className="sellerTrustCard">
            <p className="sellerName">{listing.user?.fullName || "Verified Seller"}</p>
            <div className="sellerTrustRow">
              <span className="trustPill high">{trustLabel}</span>
              <span className="sellerTrustScore">Trust score: {trustScore}</span>
            </div>
          </section>

          <section className="desktopActionPanel">
            {isLoggedIn && listing.showPhone && phone ? (
              <span className="pill">{phone}</span>
            ) : null}
            {listing.allowChat ? (
              <button className="btn" onClick={startChat} disabled={chatLoading} type="button">
                {chatLoading ? "Opening..." : "Start Chat"}
              </button>
            ) : (
              <span className="pill muted">Chat disabled</span>
            )}
            {isLoggedIn && listing.allowCall && phone ? (
              <a className="btn secondary" href={`tel:${phone}`}>
                Call
              </a>
            ) : null}
            {isLoggedIn && listing.allowSMS && phone ? (
              <a className="btn secondary" href={`sms:${phone}`}>
                SMS
              </a>
            ) : null}
            {!isLoggedIn ? (
              <Link href="/account" className="btn secondary">
                Login to contact seller
              </Link>
            ) : null}
            {chatError ? <p className="error">{chatError}</p> : null}
          </section>

          <ShareActions listingId={listing.id} title={listing.title} />
        </aside>
      </div>

      <div className="mobileStickyCta">
        {listing.allowChat ? (
          <button className="btn" onClick={startChat} disabled={chatLoading} type="button">
            {chatLoading ? "Opening..." : "Chat"}
          </button>
        ) : (
          <span className="pill muted">Chat off</span>
        )}
        {isLoggedIn && listing.allowCall && phone ? (
          <a className="btn secondary" href={`tel:${phone}`}>
            Call
          </a>
        ) : null}
        {isLoggedIn && listing.allowSMS && phone ? (
          <a className="btn secondary" href={`sms:${phone}`}>
            SMS
          </a>
        ) : null}
        {!isLoggedIn ? (
          <Link href="/account" className="btn secondary">
            Login
          </Link>
        ) : null}
      </div>
    </main>
  );
}
