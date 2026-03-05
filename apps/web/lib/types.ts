export type ListingMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  durationSec?: number | null;
};

export type Listing = {
  id: string;
  categoryId?: string;
  mainCategoryName?: string | null;
  mainCategorySlug?: string | null;
  subCategoryName?: string | null;
  subCategorySlug?: string | null;
  title: string;
  description: string;
  price: string | number;
  currency: string;
  status: string;
  city?: string | null;
  exactLocation?: string | null;
  createdAt?: string;
  showPhone: boolean;
  allowChat: boolean;
  allowCall: boolean;
  allowSMS: boolean;
  isNegotiable?: boolean;
  media: ListingMedia[];
  user?: {
    id: string;
    fullName?: string;
    phone?: string;
    lastSeenAt?: string | null;
    trustScore?: {
      score: number;
    } | null;
  };
};

export type ChatThread = {
  id: string;
  status?: "OPEN" | "CLOSED";
  lastMessageAt?: string;
  listing?: {
    id: string;
    title: string;
    status?: string;
    mainCategoryName?: string | null;
    mainCategorySlug?: string | null;
    subCategoryName?: string | null;
    subCategorySlug?: string | null;
  } | null;
  buyer?: {
    id: string;
    fullName?: string;
    phone?: string;
    city?: string;
  };
  seller?: {
    id: string;
    fullName?: string;
    phone?: string;
    city?: string;
  };
};

export type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type?: "TEXT" | "SYSTEM";
};

export type ListingOffer = {
  id: string;
  createdAt: string;
  senderId?: string;
  senderName: string;
  senderCity?: string | null;
  senderPhone?: string | null;
  amount: number | null;
  content: string;
};

export type ListingPublicMessage = {
  id: string;
  createdAt: string;
  senderId?: string;
  senderName: string;
  senderCity?: string | null;
  senderPhone?: string | null;
  content: string;
  amount: number | null;
};

export type ListingOffersResponse = {
  listingId: string;
  listingTitle: string;
  totalMessages: number;
  offers: ListingOffer[];
  recentMessages: ListingPublicMessage[];
};

export type MarketplaceSubcategory = {
  id: string;
  slug: string;
  name: string;
  parentSlug: string;
  parentName: string;
  listingCount: number;
};

export type MarketplaceCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  accent: string;
  listingCount: number;
  subcategoryCount: number;
  subcategories: MarketplaceSubcategory[];
};

export type SearchSuggestion = {
  id: string;
  type: "page" | "category" | "listing" | "chat" | "saved";
  label: string;
  href: string;
  meta?: string;
};

export type SellerOverviewMetrics = {
  totalAds: number;
  activeAds: number;
  totalViews: number;
  chatStarts: number;
  offersCount: number;
};
