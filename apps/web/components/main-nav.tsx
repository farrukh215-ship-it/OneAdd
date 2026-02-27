"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "../lib/api";

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
  const isLoggedIn = Boolean(getToken());

  return (
    <header className="topbar">
      <div className="topbarInner">
        <Link href="/" className="brand">
          Aikad
        </Link>
        <nav className="navLinks">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "navLink active" : "navLink"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {isLoggedIn ? (
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
          <span className="pill">OTP Login</span>
        )}
      </div>
    </header>
  );
}
