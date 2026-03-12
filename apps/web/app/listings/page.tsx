import { ListingsPageClient } from './ListingsPageClient';

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    city?: string;
    store?: string;
    q?: string;
    lat?: string;
    lng?: string;
    radiusKm?: string;
    minPrice?: string;
    maxPrice?: string;
    condition?: 'NEW' | 'USED';
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <ListingsPageClient
      initialParams={{
        category: params.category,
        city: params.city,
        store: params.store,
        q: params.q,
        lat: params.lat ? Number(params.lat) : undefined,
        lng: params.lng ? Number(params.lng) : undefined,
        radiusKm: params.radiusKm ? Number(params.radiusKm) : undefined,
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
        condition: params.condition,
        sort: params.sort,
        page: params.page ? Number(params.page) : 1,
      }}
    />
  );
}
