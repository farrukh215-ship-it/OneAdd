"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareActions } from "./share-actions";
import { Listing, ListingPublicMessage } from "../lib/types";
import { createListingReport, fetchListingOffers, upsertChatThread } from "../lib/api";
import {
  getSavedListingIdsLocal,
  isSellerBlockedLocal,
  toggleBlockedSellerPreference,
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

function extractMetadataValue(description: string, key: "city" | "location") {
  const match = description.match(new RegExp(`\\b${key}\\s*:\\s*([^\\n]+)`, "i"));
  if (!match?.[1]) {
    return "";
  }
  return match[1]
    .replace(/\b(condition|city|location|area)\s*:\s*.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractConditionValue(description: string) {
  const match = description.match(/\bcondition\s*:\s*(NEW|USED|LIKE_NEW)\b/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function cleanDescriptionMetadata(description: string) {
  return description
    .replace(/\bcondition\s*:\s*(NEW|USED|LIKE_NEW)\b/gi, "")
    .replace(/\bcity\s*:\s*[^,\n]+/gi, "")
    .replace(/\b(location|area)\s*:\s*[^,\n]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [saved, setSaved] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [recentMessages, setRecentMessages] = useState<ListingPublicMessage[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [sellerBlocked, setSellerBlocked] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportReason, setReportReason] = useState("Fake or misleading listing");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFeedback, setReportFeedback] = useState("");
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
  const description = cleanDescriptionMetadata(listing.description ?? "");
  const extractedCity = extractMetadataValue(listing.description ?? "", "city");
  const exactLocation = extractMetadataValue(listing.description ?? "", "location");
  const conditionLabel = extractConditionValue(listing.description ?? "");
  const cityLabel = (listing.city?.trim() || extractedCity || "Pakistan").trim();
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
    setReportMode(false);
    setReportFeedback("");
    setReportReason("Fake or misleading listing");
    setSellerBlocked(isSellerBlockedLocal(listing.user?.id));
  }, [listing.id]);

  useEffect(() => {
    if (selectedImageIndex >= visibleImages.length) {
      setSelectedImageIndex(0);
    }
  }, [selectedImageIndex, visibleImages.length]);

  useEffect(() => {
    fetchListingOffers(listing.id, 12)
      .then((result) => {
        setRecentMessages(result.recentMessages ?? []);
      })
      .catch(() => {
        setRecentMessages([]);
      });
  }, [listing.id]);

  function toggleSaved() {
    void toggleSavedListingPreference(listing.id, isLoggedIn).then(setSaved);
  }

  function toggleSellerBlocked() {
    if (!listing.user?.id) {
      return;
    }
    const next = toggleBlockedSellerPreference(listing.user.id);
    setSellerBlocked(next);
    setReportFeedback(next ? "Seller blocked. Unki listings feed/search se hide ho gayi hain." : "Seller unblocked.");
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

  async function submitReport() {
    if (!isLoggedIn) {
      router.push(`/account?next=${encodeURIComponent(`/listing/${listing.id}`)}`);
      return;
    }
    if (reportReason.trim().length < 5) {
      setReportFeedback("Report reason kam az kam 5 characters ka likhein.");
      return;
    }

    setReportLoading(true);
    setReportFeedback("");
    try {
      await createListingReport({
        targetListingId: listing.id,
        targetUserId: listing.user?.id,
        reason: reportReason.trim()
      });
      setReportFeedback("Report submit ho gaya. Moderation team review karegi.");
      setReportMode(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report submit nahi ho saka.";
      setReportFeedback(message);
    } finally {
      setReportLoading(false);
    }
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
                      <span className="sellerTrustScore">
                        {message.amount ? `Offer: PKR ${message.amount.toLocaleString()}` : message.content}
                      </span>
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
          <section className="listingFactsCard">
            <p className="listingFactLabel">Description</p>
            <p className="listingDescription">{description || "No description available."}</p>
            {conditionLabel ? (
              <p className="listingFactLine">
                <strong>Condition:</strong> {conditionLabel.replace(/_/g, " ")}
              </p>
            ) : null}
            <p className="listingFactLine">
              <strong>City:</strong> {cityLabel}
            </p>
            {exactLocation ? (
              <p className="listingFactLine">
                <strong>Area:</strong> {exactLocation}
              </p>
            ) : null}
            <p className="listingFactLine">
              <strong>{toListedDate(listing.createdAt)}</strong>
            </p>
          </section>

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
              {listing.user?.id ? (
                <button className="btn secondary" onClick={toggleSellerBlocked} type="button">
                  {sellerBlocked ? "Unblock Seller" : "Block Seller"}
                </button>
              ) : null}
              <button className="btn secondary" onClick={() => setReportMode((prev) => !prev)} type="button">
                {reportMode ? "Cancel Report" : "Report Listing"}
              </button>
              {!isLoggedIn ? (
                <Link href="/account" className="btn secondary">
                  Login to contact seller
                </Link>
              ) : null}
            </div>
            {contactVisible ? <div className="revealedContact">{phone}</div> : null}
            {reportMode ? (
              <div className="stack">
                <label className="filterLabel">
                  Report reason
                  <textarea
                    className="input"
                    rows={3}
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    placeholder="Issue explain karein (fake item, scam, wrong info...)"
                  />
                </label>
                <button className="btn secondary" type="button" onClick={submitReport} disabled={reportLoading}>
                  {reportLoading ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            ) : null}
            {reportFeedback ? <p className="shareHint">{reportFeedback}</p> : null}
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
