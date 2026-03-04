export type ListingMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  durationSec?: number | null;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: string | number;
  currency: string;
  status: string;
  city?: string | null;
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
  } | null;
  buyer?: {
    id: string;
    fullName?: string;
  };
  seller?: {
    id: string;
    fullName?: string;
  };
};

export type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type?: "TEXT" | "SYSTEM";
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
