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
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  isNearby?: boolean;
  status: "ACTIVE" | "SOLD" | "DELETED";
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
