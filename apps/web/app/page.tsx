import type { Listing } from '@tgmg/types';
import { CategoryTabs } from '../components/home/CategoryTabs';
import { HeroBanner } from '../components/home/HeroBanner';
import { QuickActions } from '../components/home/QuickActions';
import { SectionHeader } from '../components/home/SectionHeader';
import { StatsRow } from '../components/home/StatsRow';
import { StripBanner } from '../components/home/StripBanner';
import { Footer } from '../components/layout/Footer';
import { ListingGrid } from '../components/listings/ListingGrid';
import { WideCard } from '../components/listings/WideCard';
import { getCategories, getFeaturedListings, getListings } from '../lib/server-api';

function makeFallbackCars(): Listing[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'car-1',
      userId: 'u-1',
      title: 'Honda Civic 2016 - 1.8 VTi',
      description: 'Single owner, clean car.',
      price: 2200000,
      category: { id: 'c-cars', name: 'Cars', slug: 'cars', icon: '🚗' },
      categoryId: 'c-cars',
      images: [],
      condition: 'USED',
      city: 'Lahore',
      area: 'DHA Phase 6',
      status: 'ACTIVE',
      views: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'car-2',
      userId: 'u-2',
      title: 'Suzuki Alto VXL 2020',
      description: 'Economy car in good condition.',
      price: 1300000,
      category: { id: 'c-cars', name: 'Cars', slug: 'cars', icon: '🚗' },
      categoryId: 'c-cars',
      images: [],
      condition: 'USED',
      city: 'Lahore',
      area: 'Bahria Town',
      status: 'ACTIVE',
      views: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'car-3',
      userId: 'u-3',
      title: 'Toyota Fortuner 2019',
      description: 'Petrol variant, maintained.',
      price: 3500000,
      category: { id: 'c-cars', name: 'Cars', slug: 'cars', icon: '🚗' },
      categoryId: 'c-cars',
      images: [],
      condition: 'USED',
      city: 'Lahore',
      area: 'Model Town',
      status: 'ACTIVE',
      views: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category;
  const city = params.city || 'Lahore';

  const [categories, featured, carsFromApi] = await Promise.all([
    getCategories(),
    activeCategory
      ? getListings({ category: activeCategory, city, limit: 8 }).then((result) => result.data)
      : getFeaturedListings(),
    getListings({ category: 'cars', city, limit: 3 }).then((result) => result.data),
  ]);

  const cars = carsFromApi.length ? carsFromApi : makeFallbackCars();

  return (
    <>
      <CategoryTabs
        categories={[{ id: 'all', name: 'Sab', slug: '', icon: '🏠' }, ...categories]}
        activeSlug={activeCategory}
        city={city}
      />
      <section className="page-wrap">
        <HeroBanner />
        <QuickActions city={city} />
        <StatsRow />
      </section>

      <section className="border-y border-border bg-white">
        <div className="page-wrap">
          <div id="today">
            <SectionHeader title="🔥 Aaj Ki Listings" link="/listings" />
            <ListingGrid listings={featured} referenceCity={city} />
          </div>
        </div>
      </section>

      <section className="page-wrap">
        <StripBanner />
        <SectionHeader title="🚗 Gaadiyaan" link="/listings?category=cars" />
        <div className="space-y-3 px-2 md:px-5">
          {cars.map((listing) => (
            <WideCard key={listing.id} listing={listing} />
          ))}
        </div>
        <Footer />
      </section>
    </>
  );
}
