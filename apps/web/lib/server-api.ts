import type { Category, Listing, PaginatedResponse } from '@tgmg/types';
import { fallbackCategories, fallbackListings } from './fallback-data';

function apiBase() {
  // Server-side fetches should use the internal API service directly.
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

export async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${apiBase()}/categories`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as Category[];
  } catch {
    return fallbackCategories;
  }
}

export async function getFeaturedListings(): Promise<Listing[]> {
  try {
    const response = await fetch(`${apiBase()}/listings/featured`, { next: { revalidate: 60 } });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as Listing[];
  } catch {
    return fallbackListings;
  }
}

export async function getListings(params: Record<string, string | number | undefined>) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    const response = await fetch(`${apiBase()}/listings?${query.toString()}`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as PaginatedResponse<Listing>;
  } catch {
    return {
      data: fallbackListings,
      total: fallbackListings.length,
      page: Number(params.page ?? 1),
      totalPages: 1,
    };
  }
}

export async function getListing(id: string): Promise<Listing> {
  try {
    const response = await fetch(`${apiBase()}/listings/${id}`, { next: { revalidate: 30 } });
    if (!response.ok) throw new Error('Failed');
    return (await response.json()) as Listing;
  } catch {
    return fallbackListings[0]!;
  }
}
