import { useQuery } from '@tanstack/react-query';
import type { Category } from '@tgmg/types';
import { api, categoryKeys } from '../lib/api';
import { readCachedQuery, writeCachedQuery } from '../lib/query-cache';
import { STANDARD_CATEGORIES } from '../lib/standard-categories';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    staleTime: 1000 * 60 * 60,
    initialData: () => readCachedQuery<Category[]>('categories', 1000 * 60 * 60 * 24) ?? STANDARD_CATEGORIES,
    queryFn: async () => {
      try {
        const response = await api.get<Category[]>('/categories');
        const categories = response.data;
        if (!categories.length) return STANDARD_CATEGORIES;

        const merged = STANDARD_CATEGORIES.map((fallback) => {
          const match = categories.find((category) => category.slug === fallback.slug);
          return match ? { ...fallback, ...match, count: match.count ?? 0 } : fallback;
        });
        writeCachedQuery('categories', merged);
        return merged;
      } catch {
        return readCachedQuery<Category[]>('categories', 1000 * 60 * 60 * 24) ?? STANDARD_CATEGORIES;
      }
    },
  });
}
