import type { Listing } from '@tgmg/types';
import { storage } from './storage';

const ONBOARDING_KEY = 'tgmg_onboarding_complete';
const LOCATION_KEY = 'tgmg_location_pref';
const VIEWED_CATEGORIES_KEY = 'tgmg_viewed_categories';
const VIEWED_LISTINGS_KEY = 'tgmg_viewed_listings';

export type LocationPreference = {
  city?: string;
  area?: string;
  lat?: number;
  lng?: number;
  granted?: boolean;
};

function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function isOnboardingComplete() {
  return storage.getBoolean(ONBOARDING_KEY) ?? false;
}

export function completeOnboarding() {
  storage.set(ONBOARDING_KEY, true);
}

export function getLocationPreference() {
  return readJson<LocationPreference>(LOCATION_KEY, {});
}

export function setLocationPreference(value: LocationPreference) {
  storage.set(LOCATION_KEY, JSON.stringify(value));
}

export function getViewedCategorySlugs() {
  return readJson<string[]>(VIEWED_CATEGORIES_KEY, []);
}

export function getViewedListingIds() {
  return readJson<string[]>(VIEWED_LISTINGS_KEY, []);
}

export function trackViewedListing(listing: Pick<Listing, 'id' | 'category' | 'city' | 'area' | 'lat' | 'lng'>) {
  const nextListings = [listing.id, ...getViewedListingIds().filter((item) => item !== listing.id)].slice(0, 12);
  storage.set(VIEWED_LISTINGS_KEY, JSON.stringify(nextListings));

  const slug = listing.category?.slug;
  if (slug) {
    const nextCategories = [slug, ...getViewedCategorySlugs().filter((item) => item !== slug)].slice(0, 8);
    storage.set(VIEWED_CATEGORIES_KEY, JSON.stringify(nextCategories));
  }

  if (listing.city || listing.area || (typeof listing.lat === 'number' && typeof listing.lng === 'number')) {
    setLocationPreference({
      ...getLocationPreference(),
      city: listing.city,
      area: listing.area,
      lat: listing.lat,
      lng: listing.lng,
    });
  }
}
