import { useQuery } from '@tanstack/react-query';
import type { Category } from '@tgmg/types';
import { STANDARD_CATEGORIES } from '@tgmg/types';
import { api, categoryKeys } from '../lib/api';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      try {
        const response = await api.get<Category[]>('/categories');
        const categories = response.data;
        if (!categories.length) return STANDARD_CATEGORIES;

        return STANDARD_CATEGORIES.map((fallback) => {
          const match = categories.find((category) => category.slug === fallback.slug);
          return match ? { ...fallback, ...match, count: match.count ?? 0 } : fallback;
        });
      } catch {
        return STANDARD_CATEGORIES;
      }
    },
  });
}
