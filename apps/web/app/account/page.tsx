"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpLoginCard } from "../../components/otp-login-card";
import { SignupCard } from "../../components/signup-card";
import {
  activateListing,
  clearToken,
  deactivateListing,
  getMe,
  getMyListings,
  getSellerOverviewMetrics,
  markListingSold,
  relistListing
} from "../../lib/api";
import { resolveMediaUrl } from "../../lib/media-url";
import { useAuthToken } from "../../lib/use-auth-token";
import { Listing, SellerOverviewMetrics } from "../../lib/types";

type ProfileState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
};

function getPrimaryImage(listing: Listing) {
  const url = listing.media.find((item) => item.type === "IMAGE")?.url ?? "";
  return resolveMediaUrl(url);
}

function formatListedDate(timestamp?: string) {
  if (!timestamp) {
    return "Listed recently";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Listed recently";
  }
  return `Listed ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })}`;
}

function statusLabel(status?: string) {
  return (status || "ACTIVE").replace(/_/g, " ");
}

function statusTone(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "SOLD":
      return "muted";
    case "EXPIRED":
      return "warn";
    case "PAUSED":
      return "neutral";
    default:
      return "neutral";
  }
}

export default function AccountPage() {
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [items, setItems] = useState<Listing[]>([]);
  const [metrics, setMetrics] = useState<SellerOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [relistingId, setRelistingId] = useState("");
  const [actionListingId, setActionListingId] = useState("");
  const [actionType, setActionType] = useState<"SOLD" | "DEACTIVATE" | "ACTIVATE" | "RELIST" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const nextPath = new URLSearchParams(window.location.search).get("next");
    if (!token || !nextPath) {
      return;
    }
    router.push(nextPath);
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError("");
    Promise.all([getMe(), getMyListings(), getSellerOverviewMetrics()])
      .then(([me, listings, overview]) => {
        setProfile({
          fullName: me.fullName,
          email: me.email,
          phone: me.phone,
          city: me.city
        });
        setItems(listings);
        setMetrics(overview);
      })
      .catch(() => {
        setError("Profile ya listings load nahi ho sakin.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function refreshListings() {
    const [listings, overview] = await Promise.all([getMyListings(), getSellerOverviewMetrics()]);
    setItems(listings);
    setMetrics(overview);
  }

  async function onRelist(listingId: string) {
    setError("");
    setRelistingId(listingId);
    setActionListingId(listingId);
    setActionType("RELIST");
    try {
      await relistListing(listingId);
      await refreshListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Relist fail ho gaya.";
      setError(message);
    } finally {
      setRelistingId("");
      setActionListingId("");
      setActionType("");
    }
  }

  async function onMarkSold(listingId: string) {
    setError("");
    setActionListingId(listingId);
    setActionType("SOLD");
    try {
      await markListingSold(listingId);
      await refreshListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sold update fail ho gaya.";
      setError(message);
    } finally {
      setActionListingId("");
      setActionType("");
    }
  }

  async function onDeactivate(listingId: string) {
    setError("");
    setActionListingId(listingId);
    setActionType("DEACTIVATE");
    try {
      await deactivateListing(listingId);
      await refreshListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deactivate fail ho gaya.";
      setError(message);
    } finally {
      setActionListingId("");
      setActionType("");
    }
  }

  async function onActivate(listingId: string) {
    setError("");
    setActionListingId(listingId);
    setActionType("ACTIVATE");
    try {
      await activateListing(listingId);
      await refreshListings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Activate fail ho gaya.";
      setError(message);
    } finally {
      setActionListingId("");
      setActionType("");
    }
  }

  if (!mounted) {
    return <main className="screen accountScreen" />;
  }

  if (!token) {
    return (
      <main className="screen accountScreen">
        <section className="accountGrid">
          <OtpLoginCard />
          <SignupCard />
        </section>
      </main>
    );
  }

  return (
    <main className="screen accountScreen">
      <section className="panel accountPanel">
        <div className="actions accountTopActions">
          <span className="pill">Profile</span>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              clearToken();
              router.push("/");
              router.refresh();
            }}
          >
            Logout
          </button>
        </div>

        <h1 className="accountTitle">{profile?.fullName ?? "User"} - Mere Ads</h1>
        <p className="helperText accountSubline">
          {profile
            ? `${profile.email} | ${profile.phone} | ${profile.city || "Pakistan"}`
            : "Loading profile..."}
        </p>

        {loading ? <p className="helperText">Loading listings...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {metrics ? (
          <div className="accountMetricRow">
            <div className="accountMetricCard">
              <p>Total Ads</p>
              <strong>{metrics.totalAds}</strong>
            </div>
            <div className="accountMetricCard">
              <p>Active</p>
              <strong>{metrics.activeAds}</strong>
            </div>
            <div className="accountMetricCard">
              <p>Views</p>
              <strong>{metrics.totalViews}</strong>
            </div>
            <div className="accountMetricCard">
              <p>Chat Starts</p>
              <strong>{metrics.chatStarts}</strong>
            </div>
            <div className="accountMetricCard">
              <p>Offers</p>
              <strong>{metrics.offersCount}</strong>
            </div>
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
            <div className="feedStateCard">
              <div className="emptyIllustration" aria-hidden="true" />
              <p>No listings yet.</p>
              <Link href="/sell" className="btn">
                Apna Saaman Becho
              </Link>
            </div>
          ) : null}

        {items.length > 0 ? (
          <div className="accountListingsGrid">
            {items.map((listing) => (
              <article className="accountListingCard" key={listing.id}>
                <Link href={`/listing/${listing.id}`} className="accountListingMain">
                  <div className="accountListingMediaWrap">
                    {getPrimaryImage(listing) ? (
                      <img
                        className="accountListingMedia"
                        src={getPrimaryImage(listing)}
                        alt={listing.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="accountListingMediaFallback" aria-hidden="true" />
                    )}
                  </div>
                  <div className="accountListingBody">
                    <h3 className="accountListingTitle">{listing.title}</h3>
                    <div className="accountListingMetaRow">
                      <span className={`statusPill ${statusTone(listing.status)}`}>
                        {statusLabel(listing.status)}
                      </span>
                      <span className="accountListingPrice">
                        {listing.currency} {listing.price}
                      </span>
                    </div>
                    <p className="helperText accountListedDate">{formatListedDate(listing.createdAt)}</p>
                  </div>
                </Link>
                <div className="accountListingActions">
                  <Link href={`/sell?edit=${encodeURIComponent(listing.id)}`} className="btn secondary">
                    Edit ADD
                  </Link>
                  {listing.status === "ACTIVE" ? (
                    <>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => {
                          void onMarkSold(listing.id);
                        }}
                        disabled={actionListingId === listing.id}
                      >
                        {actionListingId === listing.id && actionType === "SOLD" ? "Updating..." : "Mark Sold"}
                      </button>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => {
                          void onDeactivate(listing.id);
                        }}
                        disabled={actionListingId === listing.id}
                      >
                        {actionListingId === listing.id && actionType === "DEACTIVATE" ? "Deactivating..." : "Deactivate"}
                      </button>
                    </>
                  ) : null}
                  {listing.status === "PAUSED" ? (
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => {
                        void onActivate(listing.id);
                      }}
                      disabled={actionListingId === listing.id}
                    >
                      {actionListingId === listing.id && actionType === "ACTIVATE" ? "Activating..." : "Activate"}
                    </button>
                  ) : null}
                  {listing.status === "SOLD" || listing.status === "EXPIRED" || listing.status === "PAUSED" ? (
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => {
                        void onRelist(listing.id);
                      }}
                      disabled={relistingId === listing.id}
                    >
                      {relistingId === listing.id ? "Relisting..." : "Relist"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
