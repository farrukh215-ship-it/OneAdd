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
