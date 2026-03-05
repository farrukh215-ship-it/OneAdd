"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpLoginCard } from "../../components/otp-login-card";
import { SignupCard } from "../../components/signup-card";
import {
  clearToken,
  getMe,
  getMyListings,
  getSellerOverviewMetrics,
  relistListing
} from "../../lib/api";
import { useAuthToken } from "../../lib/use-auth-token";
import { Listing, SellerOverviewMetrics } from "../../lib/types";

type ProfileState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
};

export default function AccountPage() {
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [items, setItems] = useState<Listing[]>([]);
  const [metrics, setMetrics] = useState<SellerOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [relistingId, setRelistingId] = useState("");
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

  async function onRelist(listingId: string) {
    setError("");
    setRelistingId(listingId);
    try {
      await relistListing(listingId);
      const [listings, overview] = await Promise.all([getMyListings(), getSellerOverviewMetrics()]);
      setItems(listings);
      setMetrics(overview);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Relist fail ho gaya.";
      setError(message);
    } finally {
      setRelistingId("");
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
      <section className="panel stack">
        <div className="actions">
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

        <h1 style={{ margin: 0 }}>
          {profile?.fullName ?? "User"} - Mere Ads
        </h1>
        <p className="helperText" style={{ margin: 0 }}>
          {profile
            ? `${profile.email} | ${profile.phone} | ${profile.city}`
            : "Loading profile..."}
        </p>

        {loading ? <p className="helperText">Loading listings...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {metrics ? (
          <div className="filter-bar">
            <span className="filter-chip active">Total Ads: {metrics.totalAds}</span>
            <span className="filter-chip">Active: {metrics.activeAds}</span>
            <span className="filter-chip">Views: {metrics.totalViews}</span>
            <span className="filter-chip">Chat Starts: {metrics.chatStarts}</span>
            <span className="filter-chip">Offers: {metrics.offersCount}</span>
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
          <div className="grid">
            {items.map((listing) => (
              <article className="listingCard" key={listing.id}>
                <Link href={`/listing/${listing.id}`} className="stack">
                  <p className="listingTitle">{listing.title}</p>
                  <p className="listingMeta">{listing.status}</p>
                  <p className="listingMeta">
                    Listed:{" "}
                    {listing.createdAt
                      ? new Date(listing.createdAt).toLocaleDateString("en-GB")
                      : "recently"}
                  </p>
                </Link>
                <Link href={`/sell?edit=${encodeURIComponent(listing.id)}`} className="btn secondary">
                  Edit ADD
                </Link>
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
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
