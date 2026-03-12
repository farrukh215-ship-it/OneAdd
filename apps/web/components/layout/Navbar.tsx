'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
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

        <div className="hidden items-center gap-2 rounded-full bg-[#F8F9FB] px-3 py-2 text-sm text-ink2 sm:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-green" />
          Lahore
        </div>

        <Link
          href="/post"
          className="hidden rounded-xl px-4 py-2 text-sm font-bold text-ink lg:inline-flex"
        >
          + Ad Post Karo
        </Link>
      </div>
    </header>
  );
}

