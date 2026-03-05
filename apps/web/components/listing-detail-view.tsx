"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareActions } from "./share-actions";
import { Listing, ListingOffer, ListingPublicMessage } from "../lib/types";
import { fetchListingOffers, upsertChatThread } from "../lib/api";
import {
  getSavedListingIdsLocal,
  toggleSavedListingPreference,
  trackRecentlyViewedPreference
} from "../lib/listing-preferences";
import { resolveMediaUrl } from "../lib/media-url";
import { useAuthToken } from "../lib/use-auth-token";

type ListingDetailViewProps = {
  listing: Listing;
};

function toListedDate(timestamp?: string) {
  if (!timestamp) return "Listed recently";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Listed recently";
  return `Listed on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })}`;
}

function toLastOnline(timestamp?: string | null) {
  if (!timestamp) return "Last online recently";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Last online recently";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Online just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Online ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Online ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Online ${days}d ago`;
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [saved, setSaved] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [offers, setOffers] = useState<ListingOffer[]>([]);
  const [recentMessages, setRecentMessages] = useState<ListingPublicMessage[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const isLoggedIn = mounted && Boolean(token);

  const images = useMemo(
    () =>
      listing.media
        .filter((item) => item.type === "IMAGE" && Boolean(item.url?.trim()))
        .slice(0, 6),
    [listing.media]
  );
  const video = useMemo(
    () =>
      listing.media.find(
        (item) => item.type === "VIDEO" && Boolean(item.url?.trim()) && (item.durationSec ?? 0) <= 30
      ),
    [listing.media]
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const visibleImages = useMemo(
    () => images.filter((item) => !failedImageIds.has(item.id)),
    [failedImageIds, images]
  );
  const selectedImage = visibleImages[selectedImageIndex]?.url ?? "";
  const selectedImageUrl = resolveMediaUrl(selectedImage);

  const phone = listing.user?.phone ?? "";
  const trustScore = listing.user?.trustScore?.score ?? 0;
  const trustLabel =
    trustScore >= 80 ? "Highly Trusted" : trustScore >= 50 ? "Trusted Seller" : "New Seller";

  const waPhone = phone.replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    `Assalam o Alaikum, ${listing.title} ke baray me baat karni hai. https://www.teragharmeraghar.com/listing/${listing.id}`
  )}`;

  useEffect(() => {
    setSaved(getSavedListingIdsLocal().includes(listing.id));
    void trackRecentlyViewedPreference(listing.id, isLoggedIn);
  }, [isLoggedIn, listing.id]);

  useEffect(() => {
    setContactVisible(false);
  }, [listing.id]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setFailedImageIds(new Set());
  }, [listing.id]);

  useEffect(() => {
    if (selectedImageIndex >= visibleImages.length) {
      setSelectedImageIndex(0);
    }
  }, [selectedImageIndex, visibleImages.length]);

  useEffect(() => {
    fetchListingOffers(listing.id, 12)
      .then((result) => {
        setOffers(result.offers);
        setRecentMessages(result.recentMessages ?? []);
      })
      .catch(() => {
        setOffers([]);
        setRecentMessages([]);
      });
  }, [listing.id]);

  function toggleSaved() {
    void toggleSavedListingPreference(listing.id, isLoggedIn).then(setSaved);
  }

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

  function showPrevImage() {
    if (visibleImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev <= 0 ? visibleImages.length - 1 : prev - 1));
  }

  function showNextImage() {
    if (visibleImages.length <= 1) return;
    setSelectedImageIndex((prev) => (prev + 1) % visibleImages.length);
  }

  return (
    <main className="listingDetailScreen">
      <div className="listingDetailLayout">
        <section className="listingMediaColumn">
          <div className="listingMainMedia">
            {selectedImageUrl ? (
              <img
                src={selectedImageUrl}
                alt={listing.title}
                className="listingMainImage"
                onError={() => {
                  const broken = visibleImages[selectedImageIndex];
                  if (!broken) return;
                  setFailedImageIds((prev) => {
                    if (prev.has(broken.id)) return prev;
                    const next = new Set(prev);
                    next.add(broken.id);
                    return next;
                  });
                }}
              />
            ) : (
              <div className="listingMediaFallback" aria-hidden="true" />
            )}
            {visibleImages.length > 1 ? (
              <div className="listingMainControls">
                <button className="listingMainControlBtn" type="button" onClick={showPrevImage}>
                  {"\u2039"}
                </button>
                <button className="listingMainControlBtn" type="button" onClick={showNextImage}>
                  {"\u203a"}
                </button>
              </div>
            ) : null}
          </div>

          {visibleImages.length > 1 ? (
            <div className="listingThumbRow">
              {visibleImages.map((item, index) => (
                <button
                  className={`listingThumb ${selectedImageIndex === index ? "active" : ""}`}
                  key={item.id}
                  onClick={() => setSelectedImageIndex(index)}
                  type="button"
                >
                  <img src={resolveMediaUrl(item.url)} alt={listing.title} />
                </button>
              ))}
            </div>
          ) : null}

          {video ? (
            <video
              src={resolveMediaUrl(video.url)}
              className="listingVideoBlock"
              controls
              preload="metadata"
            />
          ) : null}

          <div className="listingBelowMediaCards">
            <section className="sellerTrustCard">
              <p className="sellerName">Live Buyer Offers</p>
              {offers.length === 0 ? (
                <p className="listingDescription">
                  Abhi public offers nahi aaye. Chat me likhein: <strong>Offer: 120000</strong>
                </p>
              ) : (
                <div className="stack">
                  {offers.slice(0, 6).map((offer) => (
                    <div key={offer.id} className="sellerTrustRow">
                      <span className="pill">{offer.senderName}</span>
                      <span className="sellerTrustScore">
                        {offer.amount ? `PKR ${offer.amount.toLocaleString()}` : offer.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="sellerTrustCard">
              <p className="sellerName">Public Chat on this Product</p>
              {recentMessages.length === 0 ? (
                <p className="listingDescription">
                  Abhi public chat visible nahi hai. Buyers chat start karte hi yahan preview aayega.
                </p>
              ) : (
                <div className="stack">
                  {recentMessages.map((message) => (
                    <div key={message.id} className="sellerTrustRow">
                      <span className="pill">{message.senderName}</span>
                      <span className="sellerTrustScore">{message.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>

        <aside className="listingInfoColumn">
          <p className="kicker">Listing</p>
          <h1 className="listingTitleMain">{listing.title}</h1>
          <p className="listingPriceMain">
            {listing.currency} {listing.price}
          </p>
          {listing.isNegotiable ? <p className="pill">Negotiable</p> : null}
          <p className="listingDescription">{listing.description}</p>
          <p className="shareHint">{toListedDate(listing.createdAt)}</p>

          <section className="sellerTrustCard">
            <p className="sellerName">{listing.user?.fullName || "Verified Seller"}</p>
            <div className="sellerTrustRow">
              <span className="trustPill high">{trustLabel}</span>
              <span className="sellerTrustScore">Trust score: {trustScore}</span>
            </div>
            <p className="shareHint">{toLastOnline(listing.user?.lastSeenAt)}</p>
            <p className="shareHint">
              Note: Trust score 0 ka matlab new seller profile hai; verified details, fast replies aur successful deals se score barhta hai.
            </p>
          </section>

          <section className="desktopActionPanel">
            <div className="listingActionGrid">
              {isLoggedIn && listing.showPhone && phone ? (
                <button
                  className="btn secondary"
                  onClick={() => setContactVisible((prev) => !prev)}
                  type="button"
                >
                  {contactVisible ? "Hide Contact" : "Show Contact"}
                </button>
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
                <a className="btn secondary" href={whatsappHref} target="_blank" rel="noreferrer">
                  <span className="actionIcon" aria-hidden="true">
                    WA
                  </span>
                  Start WhatsApp
                </a>
              ) : null}
              <button className="btn secondary" onClick={toggleSaved} type="button">
                {saved ? "Saved" : "Save Listing"}
              </button>
              {!isLoggedIn ? (
                <Link href="/account" className="btn secondary">
                  Login to contact seller
                </Link>
              ) : null}
            </div>
            {contactVisible ? <div className="revealedContact">{phone}</div> : null}
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
          <a className="btn secondary" href={whatsappHref} target="_blank" rel="noreferrer">
            <span className="actionIcon" aria-hidden="true">
              WA
            </span>
            WhatsApp
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
