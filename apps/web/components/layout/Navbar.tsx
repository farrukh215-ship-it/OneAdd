'use client';

import type { SearchSuggestion } from '@tgmg/types';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad'];
const RECENT_SEARCHES_KEY = 'tgmg_recent_searches';

function readRecentSearches() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
  if (!raw) return [];
  try {
    const values = JSON.parse(raw) as string[];
    if (!Array.isArray(values)) return [];
    return values.slice(0, 5);
  } catch {
    return [];
  }
}

function writeRecentSearches(query: string) {
  if (!query.trim()) return;
  const current = readRecentSearches();
  const next = [query.trim(), ...current.filter((item) => item !== query.trim())].slice(0, 5);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? 'Lahore');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    setRecentSearches(readRecentSearches());
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem('tgmg_city');
    if (saved && CITIES.includes(saved)) {
      setCity(saved);
    }
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get<SearchSuggestion[]>('/search/suggestions', {
          params: { q: value },
        });
        setSuggestions(response.data);
      } catch {
        setSuggestions([]);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  const updateUrlWithCity = (nextCity: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('city', nextCity);
    const target = pathname?.startsWith('/listings') ? '/listings' : '/';
    router.push(`${target}?${params.toString()}`);
  };

  const navigateSearch = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('city', city);
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    else params.delete('q');
    writeRecentSearches(nextQuery);
    setRecentSearches(readRecentSearches());
    setOpen(false);
    router.push(`/listings?${params.toString()}`);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigateSearch(query);
  };

  const predictionItems = useMemo<SearchSuggestion[]>(() => {
    if (query.trim().length >= 2) return suggestions;
    return recentSearches.map((item) => ({ label: item, city: undefined }));
  }, [query, suggestions, recentSearches]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="page-wrap flex h-[52px] items-center gap-2 px-3 md:h-[60px] md:gap-4 md:px-5">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-red md:text-2xl">
          TGMG.
        </Link>

        <form onSubmit={onSubmit} className="relative min-w-0 flex-1">
          <label className="nav-search flex h-9 items-center gap-2 rounded-full px-4 text-sm text-ink2 md:h-10">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={query}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onChange={(event) => setQuery(event.target.value)}
              className="search-input min-w-0 flex-1 border-0 bg-transparent outline-none"
              placeholder="Mobile, car, furniture..."
            />
          </label>

          {open && predictionItems.length > 0 ? (
            <div className="absolute left-0 right-0 top-[44px] z-50 rounded-2xl border border-border bg-white p-2 shadow-card md:top-[48px]">
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink3">
                {query.trim().length >= 2 ? 'Predictions' : 'Recent Searches'}
              </div>
              {predictionItems.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  onClick={() => {
                    setQuery(item.label);
                    navigateSearch(item.label);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ink2 hover:bg-[#F8F9FB]"
                >
                  <span>{item.label}</span>
                  {item.city ? <span className="text-xs text-ink3">{item.city}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
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
          className="hidden rounded-xl border border-border px-4 py-2 text-sm font-bold text-ink lg:inline-flex"
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
