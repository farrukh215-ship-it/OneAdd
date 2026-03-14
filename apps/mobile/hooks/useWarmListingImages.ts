import { useEffect } from 'react';
import { Image } from 'react-native';
import type { Listing } from '@tgmg/types';

const warmedUrls = new Set<string>();

function warm(url?: string | null) {
  if (!url || warmedUrls.has(url)) return;
  warmedUrls.add(url);
  void Image.prefetch(url).catch(() => {
    warmedUrls.delete(url);
  });
}

export function warmListingImages(listings: Listing[], limit = 12) {
  listings.slice(0, limit).forEach((listing) => warm(listing.images?.[0]));
}

export function useWarmListingImages(listings: Listing[] | undefined, limit = 12) {
  useEffect(() => {
    if (!listings?.length) return;
    warmListingImages(listings, limit);
  }, [limit, listings]);
}
