"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OtpLoginCard } from "../../components/otp-login-card";
import { SignupCard } from "../../components/signup-card";
import { clearToken, getMe, getMyListings } from "../../lib/api";
import { useAuthToken } from "../../lib/use-auth-token";
import { Listing } from "../../lib/types";

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
  const [loading, setLoading] = useState(false);
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
    Promise.all([getMe(), getMyListings()])
      .then(([me, listings]) => {
        setProfile({
          fullName: me.fullName,
          email: me.email,
          phone: me.phone,
          city: me.city
        });
        setItems(listings);
      })
      .catch(() => {
        setError("Profile ya listings load nahi ho sakin.");
      })
      .finally(() => setLoading(false));
  }, [token]);

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
          {profile?.fullName ?? "User"} - My Listings
        </h1>
        <p className="helperText" style={{ margin: 0 }}>
          {profile
            ? `${profile.email} | ${profile.phone} | ${profile.city}`
            : "Loading profile..."}
        </p>

        {loading ? <p className="helperText">Loading listings...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && items.length === 0 ? (
          <div className="feedStateCard">
            <div className="emptyIllustration" aria-hidden="true" />
            <p>No listings yet.</p>
            <Link href="/sell" className="btn">
              Create First Listing
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid">
            {items.map((listing) => (
              <Link className="listingCard" href={`/listing/${listing.id}`} key={listing.id}>
                <p className="listingTitle">{listing.title}</p>
                <p className="listingMeta">{listing.status}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
