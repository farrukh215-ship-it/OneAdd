"use client";

import {
  fetchListingById,
  getRecentlyViewedListings,
  getSavedListings,
  saveListing,
  trackRecentlyViewedListing,
  unsaveListing
} from "./api";
import { Listing } from "./types";

const SAVED_LISTING_IDS_KEY = "tgmg_saved_listing_ids";
const RECENTLY_VIEWED_IDS_KEY = "tgmg_recently_viewed";
const BLOCKED_SELLER_IDS_KEY = "tgmg_blocked_seller_ids";
export const BLOCKED_SELLERS_CHANGED_EVENT = "tgmg-blocked-sellers-changed";
const MAX_SAVED_IDS = 200;
const MAX_RECENT_IDS = 20;
const MAX_BLOCKED_SELLERS = 200;

function readIds(key: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return [] as string[];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

function writeIds(key: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(key, JSON.stringify(ids));
  if (key === BLOCKED_SELLER_IDS_KEY) {
    window.dispatchEvent(new Event(BLOCKED_SELLERS_CHANGED_EVENT));
  }
}

export function getSavedListingIdsLocal() {
  return readIds(SAVED_LISTING_IDS_KEY);
}

export function getRecentlyViewedIdsLocal() {
  return readIds(RECENTLY_VIEWED_IDS_KEY);
}

export function getBlockedSellerIdsLocal() {
  return readIds(BLOCKED_SELLER_IDS_KEY);
}

export function isSellerBlockedLocal(sellerId?: string | null) {
  if (!sellerId) {
    return false;
  }
  return getBlockedSellerIdsLocal().includes(sellerId);
}

export function toggleBlockedSellerPreference(sellerId: string) {
  const blockedIds = getBlockedSellerIdsLocal();
  const isBlocked = blockedIds.includes(sellerId);
  const nextBlockedIds = isBlocked
    ? blockedIds.filter((id) => id !== sellerId)
    : [sellerId, ...blockedIds.filter((id) => id !== sellerId)].slice(0, MAX_BLOCKED_SELLERS);
  writeIds(BLOCKED_SELLER_IDS_KEY, nextBlockedIds);
  return !isBlocked;
}

export async function toggleSavedListingPreference(listingId: string, isLoggedIn: boolean) {
  const savedIds = getSavedListingIdsLocal();
  const isSaved = savedIds.includes(listingId);
  const nextSavedIds = isSaved
    ? savedIds.filter((item) => item !== listingId)
    : [listingId, ...savedIds.filter((item) => item !== listingId)].slice(0, MAX_SAVED_IDS);
  writeIds(SAVED_LISTING_IDS_KEY, nextSavedIds);

  if (isLoggedIn) {
    try {
      if (isSaved) {
        await unsaveListing(listingId);
      } else {
        await saveListing(listingId);
      }
    } catch {
      // Keep local fallback even if server sync fails.
    }
  }

  return !isSaved;
}

export async function trackRecentlyViewedPreference(listingId: string, isLoggedIn: boolean) {
  const recentIds = getRecentlyViewedIdsLocal();
  const nextRecentIds = [listingId, ...recentIds.filter((item) => item !== listingId)].slice(
    0,
    MAX_RECENT_IDS
  );
  writeIds(RECENTLY_VIEWED_IDS_KEY, nextRecentIds);

  if (isLoggedIn) {
    try {
      await trackRecentlyViewedListing(listingId);
    } catch {
      // Keep local fallback even if server sync fails.
    }
  }
}

export async function syncSavedListings(isLoggedIn: boolean) {
  const localIds = getSavedListingIdsLocal();
  if (!isLoggedIn) {
    return localIds;
  }

  try {
    await Promise.allSettled(localIds.slice(0, MAX_SAVED_IDS).map((id) => saveListing(id)));
    const server = await getSavedListings(MAX_SAVED_IDS);
    const serverIds = server.items.map((item) => item.id);
    const merged = [...serverIds, ...localIds.filter((id) => !serverIds.includes(id))].slice(
      0,
      MAX_SAVED_IDS
    );
    writeIds(SAVED_LISTING_IDS_KEY, merged);
    return merged;
  } catch {
    return localIds;
  }
}

export async function syncRecentlyViewedListings(isLoggedIn: boolean) {
  const localIds = getRecentlyViewedIdsLocal();
  if (!isLoggedIn) {
    return localIds;
  }

  try {
    await Promise.allSettled(localIds.slice(0, MAX_RECENT_IDS).map((id) => trackRecentlyViewedListing(id)));
    const server = await getRecentlyViewedListings(MAX_RECENT_IDS);
    const serverIds = server.items.map((item) => item.id);
    const merged = [...serverIds, ...localIds.filter((id) => !serverIds.includes(id))].slice(
      0,
      MAX_RECENT_IDS
    );
    writeIds(RECENTLY_VIEWED_IDS_KEY, merged);
    return merged;
  } catch {
    return localIds;
  }
}

export async function resolveListingsByIds(ids: string[], fallback: Listing[] = []) {
  if (ids.length === 0) {
    return [] as Listing[];
  }

  const fallbackMap = new Map(fallback.map((item) => [item.id, item]));
  const resolved: Listing[] = [];
  const missing: string[] = [];

  ids.forEach((id) => {
    const local = fallbackMap.get(id);
    if (local) {
      resolved.push(local);
      return;
    }
    missing.push(id);
  });

  if (missing.length === 0) {
    return resolved;
  }

  const fetched = await Promise.all(missing.map((id) => fetchListingById(id).catch(() => null)));
  const fetchedMap = new Map(
    fetched
      .filter((item): item is Listing => Boolean(item))
      .map((item) => [item.id, item])
  );

  missing.forEach((id) => {
    const item = fetchedMap.get(id);
    if (item) {
      resolved.push(item);
    }
  });

  return resolved;
}
