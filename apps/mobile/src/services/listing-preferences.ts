import AsyncStorage from "@react-native-async-storage/async-storage";
import { getListingById } from "./api";
import type { Listing } from "../types";

const SAVED_LISTING_IDS_KEY = "tgmg_saved_listing_ids";
const RECENTLY_VIEWED_IDS_KEY = "tgmg_recently_viewed";
const MAX_SAVED_IDS = 200;
const MAX_RECENT_IDS = 20;

async function readIds(key: string) {
  const raw = await AsyncStorage.getItem(key);
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

async function writeIds(key: string, ids: string[]) {
  await AsyncStorage.setItem(key, JSON.stringify(ids));
}

export async function getSavedListingIds() {
  return readIds(SAVED_LISTING_IDS_KEY);
}

export async function isListingSaved(listingId: string) {
  const savedIds = await readIds(SAVED_LISTING_IDS_KEY);
  return savedIds.includes(listingId);
}

export async function toggleSavedListingId(listingId: string) {
  const savedIds = await readIds(SAVED_LISTING_IDS_KEY);
  const isSaved = savedIds.includes(listingId);
  const nextIds = isSaved
    ? savedIds.filter((item) => item !== listingId)
    : [listingId, ...savedIds.filter((item) => item !== listingId)].slice(0, MAX_SAVED_IDS);

  await writeIds(SAVED_LISTING_IDS_KEY, nextIds);
  return !isSaved;
}

export async function addRecentlyViewedListingId(listingId: string) {
  const recentIds = await readIds(RECENTLY_VIEWED_IDS_KEY);
  const nextIds = [listingId, ...recentIds.filter((item) => item !== listingId)].slice(0, MAX_RECENT_IDS);
  await writeIds(RECENTLY_VIEWED_IDS_KEY, nextIds);
}

export async function getRecentlyViewedListingIds() {
  return readIds(RECENTLY_VIEWED_IDS_KEY);
}

export async function clearRecentlyViewedListingIds() {
  await AsyncStorage.removeItem(RECENTLY_VIEWED_IDS_KEY);
}

export async function resolveListingsByIds(ids: string[], fallback: Listing[] = []) {
  if (ids.length === 0) {
    return [] as Listing[];
  }

  const fallbackMap = new Map(fallback.map((item) => [item.id, item]));
  const resolved: Listing[] = [];
  const missingIds: string[] = [];

  ids.forEach((id) => {
    const fromFallback = fallbackMap.get(id);
    if (fromFallback) {
      resolved.push(fromFallback);
      return;
    }
    missingIds.push(id);
  });

  if (missingIds.length === 0) {
    return resolved;
  }

  const fetched = await Promise.all(
    missingIds.map((id) =>
      getListingById(id).catch(() => null)
    )
  );

  const fetchedMap = new Map(
    fetched
      .filter((item): item is Listing => Boolean(item))
      .map((item) => [item.id, item])
  );

  missingIds.forEach((id) => {
    const item = fetchedMap.get(id);
    if (item) {
      resolved.push(item);
    }
  });

  return resolved;
}
