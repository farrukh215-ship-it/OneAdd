"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getMe } from "../lib/api";
import { useAuthToken } from "../lib/use-auth-token";

const links = [
  { href: "/", label: "Home", icon: "\ud83c\udfe0" },
  { href: "/search", label: "Dhundo", icon: "\ud83d\udd0d" },
  { href: "/reels", label: "Reels", icon: "\ud83c\udfac" },
  { href: "/chat", label: "Chat", icon: "\ud83d\udcac" },
  { href: "/my-listings", label: "Mere Ads", icon: "\ud83d\udccb" }
];

function isLinkActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/my-listings") {
    return pathname === "/my-listings" || pathname === "/account";
  }
  return pathname === href;
}

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { mounted, token } = useAuthToken();
  const isLoggedIn = mounted && Boolean(token);
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      setAccountName("");
      return;
    }
    getMe()
      .then((profile) => {
        setAccountName(profile.fullName || profile.email || "Account");
      })
      .catch(() => setAccountName("Account"));
  }, [isLoggedIn]);

  return (
    <>
      <div className="announce-bar">
        <span className="announce-text">
          {"\ud83c\uddf5\ud83c\uddf0"} Pakistan ka pehla real-person marketplace -
          <span> Shopkeeper Spam Blocked | Ek Banda | Ek ADD</span>
        </span>
      </div>

      <nav className="navbar">
        <Link href="/" className="nav-logo" aria-label="TGMG Home">
          <div className="nav-logo-icon nav-logo-image">
            <Image src="/brand/tgmg-mark.png" alt="TGMG logo" width={38} height={38} priority />
          </div>
          <div>
            <div className="nav-logo-name">TeraGharMeraGhar</div>
            <div className="nav-logo-domain">teragharmeraghar.com</div>
          </div>
        </Link>

        <ul className="nav-links">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={isLinkActive(pathname, link.href) ? "active" : ""}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          {!mounted ? (
            <span className="btn-ghost">Login</span>
          ) : isLoggedIn ? (
            <>
              <Link href="/account" className="btn-ghost nav-account-chip" title={accountName}>
                {accountName}
              </Link>
              <button
                className="btn-ghost"
                onClick={() => {
                  clearToken();
                  router.refresh();
                }}
                type="button"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/account" className="btn-ghost">
              Login
            </Link>
          )}

          <Link href="/sell" className="btn-primary">
            <span aria-hidden="true">{"\ud83c\udfe0"}</span>
            Apna Saaman Becho
          </Link>
        </div>
      </nav>

      <nav className="mobile-nav" aria-label="Primary">
        <div className="mobile-nav-inner">
          {links.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mnav-item ${isLinkActive(pathname, link.href) ? "active" : ""}`}
            >
              <span className="mnav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="mnav-label">{link.label}</span>
            </Link>
          ))}

          <Link href="/sell" className="mnav-item mnav-sell">
            <span className="mnav-icon" aria-hidden="true">
              {"\u2795"}
            </span>
            <span className="mnav-label">Becho</span>
          </Link>

          {links.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`mnav-item ${isLinkActive(pathname, link.href) ? "active" : ""}`}
            >
              <span className="mnav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="mnav-label">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
