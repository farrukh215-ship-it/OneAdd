'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? 'Lahore');
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const saved = window.localStorage.getItem('tgmg_city');
    if (saved && CITIES.includes(saved)) {
      setCity(saved);
    }
  }, []);

  const updateUrlWithCity = (nextCity: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('city', nextCity);
    const target = pathname?.startsWith('/listings') ? '/listings' : '/';
    router.push(`${target}?${params.toString()}`);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('city', city);
    if (query.trim()) params.set('q', query.trim());
    else params.delete('q');
    router.push(`/listings?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="page-wrap flex h-[52px] items-center gap-2 px-3 md:h-[60px] md:gap-4 md:px-5">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-red md:text-2xl">
          TGMG.
        </Link>

        <form onSubmit={onSubmit} className="min-w-0 flex-1">
          <label className="nav-search flex h-9 items-center gap-2 rounded-full px-4 text-sm text-ink2 md:h-10">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="search-input min-w-0 flex-1 border-0 bg-transparent outline-none"
              placeholder="Mobile, car, furniture..."
            />
          </label>
        </form>

        <div className="hidden items-center gap-2 rounded-full bg-[#F8F9FB] px-2 py-1.5 text-sm text-ink2 sm:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-green" />
          <select
            value={city}
            onChange={(event) => {
              const nextCity = event.target.value;
              setCity(nextCity);
              window.localStorage.setItem('tgmg_city', nextCity);
              updateUrlWithCity(nextCity);
            }}
            className="bg-transparent text-sm font-semibold outline-none"
          >
            {CITIES.map((cityOption) => (
              <option key={cityOption} value={cityOption}>
                {cityOption}
              </option>
            ))}
          </select>
        </div>

        <Link
          href="/post"
          className="hidden rounded-xl px-4 py-2 text-sm font-bold text-ink lg:inline-flex"
        >
          + Ad Post Karo
        </Link>
        {currentUser ? (
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/profile"
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-ink"
            >
              {currentUser.name?.trim() || 'Profile'}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-red px-4 py-2 text-sm font-bold text-red"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/auth"
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-ink"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="rounded-xl border border-red px-4 py-2 text-sm font-bold text-red"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
