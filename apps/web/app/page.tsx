import type { Listing } from '@tgmg/types';
import { Footer } from '../components/layout/Footer';
import { ListingGrid } from '../components/listings/ListingGrid';
import { WideCard } from '../components/listings/WideCard';
import { getCategories, getFeaturedListings } from '../lib/server-api';

const quickActions = [
  '+ Ad Post Karo',
  'Taaza Listings',
  'Mere Paas',
  'Top Deals',
  'Naye Items',
];

const stats = [
  { value: '12K+', label: 'Active Listings' },
  { value: '0', label: 'Dealers Allowed' },
  { value: 'Free', label: 'Ad Lagao' },
];

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

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getFeaturedListings(),
  ]);

  const cards = featured.length ? featured : [];
  const cars = makeFallbackCars();

  return (
    <>
      <section className="border-b border-border bg-white">
        <div className="page-wrap hide-scrollbar flex gap-0 overflow-x-auto px-1">
          <button className="border-b-[3px] border-red px-4 py-2 text-[11px] font-semibold text-red">
            🏠 Sab
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className="border-b-[3px] border-transparent px-4 py-2 text-[11px] font-semibold text-ink2"
            >
              <span className="mr-1 text-[18px]">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-2 mt-3 rounded-card bg-red px-4 py-5 text-white shadow-card md:mx-5 md:px-6 md:py-7">
        <div className="flex items-center justify-between gap-3">
          <div className="max-w-2xl">
            <h1 className="text-[20px] font-extrabold leading-tight md:text-[28px]">
              OLX se tang? Yahan aao!
            </h1>
            <p className="mt-2 text-[12px] text-white/85">
              Sirf asli malik bechte hain, koi dealer nahi.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px]">
                ✓ Verified Sellers
              </span>
              <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px]">
                No Dealers
              </span>
              <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[11px]">
                Free
              </span>
            </div>
            <button className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-red">
              Abhi Dhundein
            </button>
          </div>
          <div className="text-[52px] leading-none sm:text-[72px]">🏪</div>
        </div>
      </section>

      <section className="hide-scrollbar flex gap-2 overflow-x-auto px-2 py-3 md:px-5">
        {quickActions.map((item, index) => (
          <button
            key={item}
            className={`chip shrink-0 ${index === 0 ? '!border-red !bg-red !text-white' : ''}`}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-2 px-2 pb-2 md:px-5">
        {stats.map((stat) => (
          <div key={stat.label} className="surface py-3 text-center">
            <div className="text-[20px] font-extrabold text-red">{stat.value}</div>
            <div className="text-[11px] text-ink2">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="border-y border-border bg-white">
        <div className="flex items-center justify-between px-2 py-3 md:px-5">
          <h2 className="text-[32px] font-bold tracking-tight text-ink">🔥 Aaj Ki Listings</h2>
          <span className="text-sm font-semibold text-ink">Sab dekho</span>
        </div>
      </section>

      <ListingGrid listings={cards} />

      <section className="mx-2 my-4 rounded-card bg-[#1F2937] px-4 py-3 text-white shadow-card md:mx-5">
        <div className="text-sm font-bold">Koi Dealer Allowed Nahi</div>
        <div className="mt-1 text-xs text-white/80">Sirf asli ghar walay seller ko listing milti hai.</div>
      </section>

      <section className="flex items-center justify-between px-2 py-3 md:px-5">
        <h2 className="section-title">🚗 Gaadiyaan</h2>
        <span className="text-sm font-semibold text-red">Sab dekho</span>
      </section>
      <div className="space-y-3 px-2 md:px-5">
        {cars.map((listing) => (
          <WideCard key={listing.id} listing={listing} />
        ))}
      </div>

      <section className="px-2 py-3 md:px-5">
        <div className="rounded-card bg-red px-4 py-5 text-center text-white shadow-card">
          <div className="text-3xl">📢</div>
          <h3 className="mt-2 text-[18px] font-extrabold">Apna Saman Becho!</h3>
          <p className="mt-2 text-sm text-white/85">
            Free mein ad lagao, 2 minute ka kaam hai.
          </p>
          <button className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-red">
            + Ad Post Karo - Bilkul Free
          </button>
        </div>
      </section>

      <Footer />
    </>
  );
}

