import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import type { Listing, PaginatedResponse } from '@tgmg/types';
import { warmListingImages } from '../hooks/useWarmListingImages';
import { readCachedQuery } from '../lib/query-cache';

function collectCachedListings() {
  const keys = [
    'listings:{"city":"Lahore","limit":8,"sort":"newest"}',
    'listings:{"limit":24,"sort":"newest"}',
  ];

  const listings: Listing[] = [];
  for (const key of keys) {
    const cached = readCachedQuery<PaginatedResponse<Listing>>(key, 1000 * 60 * 60 * 12);
    if (cached?.data?.length) {
      listings.push(...cached.data);
    }
  }

  return Array.from(new Map(listings.map((item) => [item.id, item])).values());
}

export function BackgroundSyncManager() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const preload = () => {
      const listings = collectCachedListings().slice(0, 20);
      warmListingImages(listings, 20);
    };

    preload();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['listing-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['listings'] });
        preload();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [queryClient]);

  return null;
}
