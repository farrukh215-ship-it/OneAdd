import { useQuery } from '@tanstack/react-query';
import type { Category } from '@tgmg/types';
import { api, categoryKeys } from '../lib/api';
import { fallbackCategories } from '../lib/fallback-data';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      try {
        const response = await api.get<Category[]>('/categories');
        return response.data;
      } catch {
        return fallbackCategories;
      }
    },
  });
}
