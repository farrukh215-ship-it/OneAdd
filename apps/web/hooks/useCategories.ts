'use client';

import { useQuery } from '@tanstack/react-query';
import type { Category } from '@tgmg/types';
import { api } from '../lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const response = await api.get<Category[]>('/categories');
      return response.data;
    },
    initialData: [],
  });
}
