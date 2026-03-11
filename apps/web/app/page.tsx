import { CategoryTabs } from '../components/home/CategoryTabs';
import { HeroBanner } from '../components/home/HeroBanner';
import { PostAdCta } from '../components/home/PostAdCta';
import { QuickActions } from '../components/home/QuickActions';
import { SectionHeader } from '../components/home/SectionHeader';
import { StatsRow } from '../components/home/StatsRow';
import { StripBanner } from '../components/home/StripBanner';
import { Footer } from '../components/layout/Footer';
import { ListingGrid } from '../components/listings/ListingGrid';
import { WideCard } from '../components/listings/WideCard';
import { getCategories, getFeaturedListings, getListings } from '../lib/server-api';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category;

  const [categories, featured, cars] = await Promise.all([
    getCategories(),
    activeCategory
      ? getListings({ category: activeCategory, limit: 8 }).then((result) => result.data)
      : getFeaturedListings(),
    getListings({ category: 'cars', limit: 3 }).then((result) => result.data),
  ]);

  return (
    <>
      <div className="page-wrap">
        <HeroBanner />
        <QuickActions />
        <StatsRow />
      </div>
      <CategoryTabs categories={categories} activeSlug={activeCategory} />
      <div className="page-wrap">
        <div id="today">
          <SectionHeader title="🔥 Aaj Ki Listings" link="/listings" />
          <ListingGrid listings={featured} />
        </div>
        <StripBanner />
        <SectionHeader title="🚗 Gaadiyaan" link="/listings?category=cars" />
        <div className="space-y-3 px-2 md:px-5">
          {cars.slice(0, 3).map((listing) => (
            <WideCard key={listing.id} listing={listing} />
          ))}
        </div>
        <PostAdCta />
        <Footer />
      </div>
    </>
  );
}
