import type { Category, Listing, PaginatedResponse } from '@tgmg/types';

function apiBase() {
  // Server-side fetches should use the internal API service directly.
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${apiBase()}/categories`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as Category[];
  } catch {
    return [];
  }
}

export async function getFeaturedListings(city?: string): Promise<Listing[]> {
  try {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    params.set('limit', '8');
    params.set('sort', 'newest');
    const response = await fetch(`${apiBase()}/listings?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed');
    return ((await response.json()) as PaginatedResponse<Listing>).data;
  } catch {
    return [];
  }
}

export async function getListings(params: Record<string, string | number | undefined>) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const response = await fetch(`${apiBase()}/listings?${query.toString()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as PaginatedResponse<Listing>;
  } catch {
    return {
      data: [],
      total: 0,
      page: Number(params.page ?? 1),
      totalPages: 0,
    };
  }
}

export async function getListing(id: string): Promise<Listing> {
  try {
    const response = await fetch(`${apiBase()}/listings/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as Listing;
  } catch {
    throw new Error(`Listing ${id} not found`);
  }
}
