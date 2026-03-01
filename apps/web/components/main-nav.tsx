"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "../lib/api";
import { useAuthToken } from "../lib/use-auth-token";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/sell", label: "Sell" },
  { href: "/my-listings", label: "My Listings" },
  { href: "/chat", label: "Chat" },
  { href: "/reels", label: "Reels" }
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const isLoggedIn = Boolean(token);

  return (
    <header className="topbar">
      <div className="topbarInner">
        <Link href="/" className="brand" aria-label="ZaroratBazar Home">
          <span className="brandMarkWrap">
            <img src="/brand/zaroratbazar-mark.svg" alt="ZaroratBazar logo" className="brandMarkImage" />
          </span>
          <span className="brandText">
            <strong>ZaroratBazar</strong>
            <small>صرف اصل لوگ، اصل چیزیں</small>
          </span>
        </Link>
        <nav className="navLinks">
          {links.map((link) => {
            const isMyListingsLink = link.href === "/my-listings";
            const isActive = isMyListingsLink
              ? pathname === "/my-listings" || pathname === "/account"
              : pathname === link.href;
            return (
            <Link
              key={link.href}
              href={link.href}
              className={isActive ? "navLink active" : "navLink"}
            >
              {link.label}
            </Link>
            );
          })}
        </nav>
        <div className="navActions">
          {!mounted ? (
            <span className="pill">OTP Login</span>
          ) : isLoggedIn ? (
            <button
              className="btn secondary"
              onClick={() => {
                clearToken();
                router.refresh();
              }}
              type="button"
            >
              Logout
            </button>
          ) : (
            <Link href="/account" className="pill">
              OTP Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
