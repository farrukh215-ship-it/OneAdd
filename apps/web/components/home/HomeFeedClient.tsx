'use client';

import type { Listing } from '@tgmg/types';
import { useEffect, useMemo, useState } from 'react';
import { ListingGrid } from '../listings/ListingGrid';
import { SectionHeader } from './SectionHeader';

export function HomeFeedClient({
  featured,
  fallbackCity,
}: {
  featured: Listing[];
  fallbackCity?: string;
}) {
  const [preferredCity, setPreferredCity] = useState(fallbackCity);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCity = window.localStorage.getItem('tgmg_city');
    if (savedCity) setPreferredCity(savedCity);
    const raw = window.localStorage.getItem('tgmg_recent_searches');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const personalized = useMemo(() => {
    if (!recentSearches.length && !preferredCity) return [];
    const terms = recentSearches.map((item) => item.toLowerCase());
    return featured
      .filter((listing) => {
        const haystack = `${listing.title} ${listing.description} ${listing.category.name}`.toLowerCase();
        const cityMatch = preferredCity ? listing.city.toLowerCase() === preferredCity.toLowerCase() : true;
        const termMatch = terms.length ? terms.some((term) => haystack.includes(term)) : true;
        return cityMatch && termMatch;
      })
      .slice(0, 4);
  }, [featured, preferredCity, recentSearches]);

  if (!personalized.length) return null;

  return (
    <section className="border-y border-border bg-white">
      <div className="page-wrap">
        <SectionHeader title="Aap Ke Liye" link="/listings" />
        <ListingGrid listings={personalized} referenceCity={preferredCity} />
      </div>
    </section>
  );
}
