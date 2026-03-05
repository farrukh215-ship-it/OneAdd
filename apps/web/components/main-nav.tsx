"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { clearToken, getCategoryCatalog, getMe } from "../lib/api";
import { MarketplaceCategory } from "../lib/types";
import { useAuthToken } from "../lib/use-auth-token";
import { CommandPalette } from "./command-palette";

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
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategorySlug, setSearchCategorySlug] = useState("");
  const [searchSubcategorySlug, setSearchSubcategorySlug] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const mobileAccountName = accountName.split(" ")[0] || "You";
  const selectedSearchCategory = useMemo(
    () => categories.find((item) => item.slug === searchCategorySlug) ?? null,
    [categories, searchCategorySlug]
  );

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

  useEffect(() => {
    getCategoryCatalog()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  function onHeaderSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const query = searchQuery.trim();
    const city = searchCity.trim();
    if (query) {
      params.set("q", query);
    }
    if (searchCategorySlug) {
      params.set("category", searchCategorySlug);
    }
    if (searchSubcategorySlug) {
      params.set("subcategory", searchSubcategorySlug);
    }
    if (city) {
      params.set("city", city);
    }
    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
  }

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
          <CommandPalette />
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
      {pathname === "/" || pathname === "/search" ? (
        <section className="header-search-wrap">
          <form className="search-box search-box-advanced nav-search-box" onSubmit={onHeaderSearchSubmit}>
            <label className="search-field search-field-keyword">
              <span className="search-field-label">Product</span>
              <div className="search-input-wrap">
                <span className="search-icon" aria-hidden="true">
                  {"\ud83d\udd0d"}
                </span>
                <input
                  className="search-input"
                  name="q"
                  placeholder="Product name (iPhone, Sofa, Cycle...)"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </label>
            <label className="search-field">
              <span className="search-field-label">Category</span>
              <select
                className="search-select"
                value={searchCategorySlug}
                onChange={(event) => {
                  setSearchCategorySlug(event.target.value);
                  setSearchSubcategorySlug("");
                }}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <span className="search-field-label">Subcategory</span>
              <select
                className="search-select"
                value={searchSubcategorySlug}
                onChange={(event) => setSearchSubcategorySlug(event.target.value)}
                disabled={!selectedSearchCategory}
              >
                <option value="">
                  {selectedSearchCategory ? "All Subcategories" : "Select category first"}
                </option>
                {(selectedSearchCategory?.subcategories ?? []).map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.slug}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="search-field">
              <span className="search-field-label">City / Area</span>
              <input
                className="search-select"
                name="city"
                placeholder="Karachi, Lahore, DHA..."
                value={searchCity}
                onChange={(event) => setSearchCity(event.target.value)}
              />
            </label>
            <button className="search-btn" type="submit">
              Smart Search
            </button>
          </form>
        </section>
      ) : null}

      <nav className="mobile-nav" aria-label="Primary">
        <div className="mobile-nav-inner">
          {mounted && isLoggedIn ? (
            <div className="mobile-user-chip" title={accountName}>
              Logged in: {mobileAccountName}
            </div>
          ) : null}
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
