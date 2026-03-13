import { CategorySectionCarousel } from '../components/home/CategorySectionCarousel';
import { HomeFeedClient } from '../components/home/HomeFeedClient';
import { CategoryTabs } from '../components/home/CategoryTabs';
import { HeroBanner } from '../components/home/HeroBanner';
import { QuickActions } from '../components/home/QuickActions';
import { SectionHeader } from '../components/home/SectionHeader';
import { StatsRow } from '../components/home/StatsRow';
import { StripBanner } from '../components/home/StripBanner';
import { Footer } from '../components/layout/Footer';
import { ListingGrid } from '../components/listings/ListingGrid';
import { getCategories, getFeaturedListings, getListings } from '../lib/server-api';

export const dynamic = 'force-dynamic';

async function getCategoryListings(slug: string, city: string) {
  const cityResult = await getListings({ category: slug, city, limit: 6 });
  if (cityResult.data.length) return cityResult.data;

  const globalResult = await getListings({ category: slug, limit: 6 });
  return globalResult.data;
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
    ? await getCategoryListings(activeCategory, city)
    : await (async () => {
        const featuredListings = await getFeaturedListings(city);
        if (featuredListings.length) return featuredListings;
        return getFeaturedListings();
      })();

  const categorySections = await Promise.all(
    categories.map(async (category) => ({
      category,
      listings: await getCategoryListings(category.slug, city),
    })),
  );

  return (
    <>
      <CategoryTabs
        categories={[{ id: 'all', name: 'Sab', slug: '', icon: 'All' }, ...categories]}
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
            <SectionHeader title="Aaj Ki Listings" link="/listings" />
            <ListingGrid listings={featured.slice(0, 6)} referenceCity={city} />
          </div>
        </div>
      </section>

      <HomeFeedClient featured={featured} fallbackCity={city} />

      <section className="page-wrap">
        <StripBanner />
      </section>

      {categorySections.map((section) => (
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
