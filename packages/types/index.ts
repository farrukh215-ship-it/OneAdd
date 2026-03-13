export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  city?: string;
  area?: string;
  cnicHash?: string;
  verified: boolean;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count?: number;
}

export type StandardCategorySeed = {
  name: string;
  slug: string;
  icon: string;
  order: number;
};

export const STANDARD_CATEGORY_SEEDS: StandardCategorySeed[] = [
  { name: 'Mobile Phones', slug: 'mobiles', icon: '📱', order: 1 },
  { name: 'Cars', slug: 'cars', icon: '🚗', order: 2 },
  { name: 'Property', slug: 'property', icon: '🏠', order: 3 },
  { name: 'Electronics', slug: 'electronics', icon: '💻', order: 4 },
  { name: 'Furniture', slug: 'furniture', icon: '🛋️', order: 5 },
  { name: 'Cycles & Bikes', slug: 'cycles', icon: '🚲', order: 6 },
  { name: 'Fashion', slug: 'fashion', icon: '👕', order: 7 },
  { name: 'Books', slug: 'books', icon: '📚', order: 8 },
  { name: 'Pets', slug: 'pets', icon: '🐾', order: 9 },
  { name: 'Services', slug: 'services', icon: '⚙️', order: 10 },
];

export const STANDARD_CATEGORIES: Category[] = STANDARD_CATEGORY_SEEDS.map((category) => ({
  id: category.slug,
  name: category.name,
  slug: category.slug,
  icon: category.icon,
  count: 0,
}));

export interface Listing {
  id: string;
  userId: string;
  user?: Pick<User, "id" | "name" | "city" | "area" | "verified" | "createdAt" | "updatedAt">;
  title: string;
  description: string;
  price: number;
  category: Category;
  categoryId: string;
  images: string[];
  videos?: string[];
  condition: "NEW" | "USED";
  storeType?: "ONLINE" | "ROAD";
  isStore?: boolean;
  isFeatured?: boolean;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  isNearby?: boolean;
  status: "ACTIVE" | "PENDING" | "INACTIVE" | "SOLD" | "DELETED";
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingMessage {
  id: string;
  threadId: string;
  userId: string;
  user?: Pick<User, "id" | "name" | "city" | "verified">;
  message: string;
  imageUrl?: string | null;
  offerAmount?: number | null;
  createdAt: string;
}

export interface ListingOffer {
  id: string;
  listingId: string;
  userId: string;
  amount: number;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "city" | "verified">;
}

export interface ListingThreadResponse {
  listingId: string;
  messages: ListingMessage[];
  offers: ListingOffer[];
  nearestOffer?: ListingOffer | null;
  bestOffer?: ListingOffer | null;
}

export interface SearchSuggestion {
  label: string;
  categorySlug?: string;
  categoryName?: string;
  city?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string;
  type: "contact" | "saved_update" | "new_listing";
  createdAt: string;
}

export interface ListingDashboardPoint {
  label: string;
  contacts: number;
  listings: number;
}

export interface ListingDashboard {
  totalViews: number;
  totalContacts: number;
  activeListings: number;
  soldListings: number;
  inactiveListings: number;
  points: ListingDashboardPoint[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
