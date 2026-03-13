import type { Category, Listing } from '@tgmg/types';

export const fallbackCategories: Category[] = [
  { id: 'mobiles', name: 'Mobile Phones', slug: 'mobiles', icon: '📱' },
  { id: 'cars', name: 'Cars', slug: 'cars', icon: '🚗' },
  { id: 'property', name: 'Property', slug: 'property', icon: '🏠' },
  { id: 'electronics', name: 'Electronics', slug: 'electronics', icon: '💻' },
  { id: 'furniture', name: 'Furniture', slug: 'furniture', icon: '🛋️' },
  { id: 'cycles', name: 'Cycles & Bikes', slug: 'cycles', icon: '🚲' },
  { id: 'fashion', name: 'Fashion', slug: 'fashion', icon: '👕' },
  { id: 'books', name: 'Books', slug: 'books', icon: '📚' },
  { id: 'pets', name: 'Pets', slug: 'pets', icon: '🐾' },
  { id: 'services', name: 'Services', slug: 'services', icon: '⚙️' },
];

const cityData: Array<{ city: string; area: string; lat: number; lng: number }> = [
  { city: 'Lahore', area: 'Gulberg', lat: 31.5204, lng: 74.3587 },
  { city: 'Karachi', area: 'Clifton', lat: 24.8607, lng: 67.0011 },
  { city: 'Islamabad', area: 'F-8', lat: 33.6844, lng: 73.0479 },
  { city: 'Rawalpindi', area: 'Saddar', lat: 33.5651, lng: 73.0169 },
  { city: 'Faisalabad', area: 'People Colony', lat: 31.4504, lng: 73.135 },
];

export const fallbackListings: Listing[] = fallbackCategories.flatMap((category, index) =>
  Array.from({ length: 2 }).map((_, entryIndex) => {
    const city = cityData[(index + entryIndex) % cityData.length]!;
    const isStore = entryIndex === 1;
    const storeType = isStore ? (index % 2 === 0 ? 'ROAD' : 'ONLINE') : undefined;
    const now = new Date().toISOString();
    const sellerId = `demo-user-${entryIndex + 1}`;
    return {
      id: `demo-${category.slug}-${entryIndex + 1}`,
      userId: sellerId,
      user: {
        id: sellerId,
        name: entryIndex === 0 ? 'Ali Khan' : 'Sara Malik',
        city: city.city,
        area: city.area,
        verified: true,
        createdAt: now,
        updatedAt: now,
      },
      title: `${category.name} Demo ${entryIndex + 1}`,
      description: `${category.name} ki clean condition listing, asli malik se direct deal.`,
      price: 5000 + (index + 1) * 7500 + entryIndex * 2000,
      category,
      categoryId: category.id,
      images: [
        'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
      ],
      videos: [],
      condition: entryIndex === 0 ? 'USED' : 'NEW',
      storeType,
      isStore,
      city: city.city,
      area: city.area,
      lat: city.lat + entryIndex * 0.01,
      lng: city.lng + entryIndex * 0.01,
      status: 'ACTIVE',
      views: 0,
      createdAt: now,
      updatedAt: now,
    };
  }),
);
