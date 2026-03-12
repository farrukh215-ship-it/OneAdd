import type { Listing } from '@tgmg/types';
import { CategorySectionCarousel } from '../components/home/CategorySectionCarousel';
import { CategoryTabs } from '../components/home/CategoryTabs';
import { HeroBanner } from '../components/home/HeroBanner';
import { QuickActions } from '../components/home/QuickActions';
import { SectionHeader } from '../components/home/SectionHeader';
import { StatsRow } from '../components/home/StatsRow';
import { StripBanner } from '../components/home/StripBanner';
import { Footer } from '../components/layout/Footer';
import { ListingGrid } from '../components/listings/ListingGrid';
import { getCategories, getFeaturedListings, getListings } from '../lib/server-api';

function fallbackListingsByCategory(city: string): Listing[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'fallback-1',
      userId: 'u1',
      title: 'Honda Civic 2016',
      description: 'Clean car.',
      price: 2200000,
      category: { id: 'c-cars', name: 'Cars', slug: 'cars', icon: '🚗' },
      categoryId: 'c-cars',
      images: [],
      condition: 'USED',
      city,
      area: 'DHA',
      status: 'ACTIVE',
      views: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'fallback-2',
      userId: 'u2',
      title: 'iPhone 13 PTA',
      description: 'Good condition.',
      price: 115000,
      category: { id: 'c-mobiles', name: 'Mobile Phones', slug: 'mobiles', icon: '📱' },
      categoryId: 'c-mobiles',
      images: [],
      condition: 'USED',
      city,
      area: 'Johar Town',
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
  const city = params.city || 'Lahore';
  const activeCategory = params.category;

  const categories = await getCategories();

  const featured = activeCategory
    ? await getListings({ category: activeCategory, city, limit: 8 }).then((result) => result.data)
    : await getFeaturedListings();

  const categorySections = await Promise.all(
    categories.map(async (category) => ({
      category,
      listings: await getListings({ category: category.slug, city, limit: 10 }).then((result) => result.data),
    })),
  );

  const nonEmptySections = categorySections.filter((section) => section.listings.length > 0);
  const safeSections = nonEmptySections.length
    ? nonEmptySections
    : [
        {
          category: { id: 'c-fallback', name: 'Cars', slug: 'cars', icon: '🚗' },
          listings: fallbackListingsByCategory(city),
        },
      ];

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
      </section>

      {safeSections.map((section) => (
        <CategorySectionCarousel
          key={section.category.id}
          title={`${section.category.icon} ${section.category.name}`}
          slug={section.category.slug}
          listings={section.listings}
          city={city}
        />
      ))}

      <section className="page-wrap">
        <Footer />
      </section>
    </>
  );
}
