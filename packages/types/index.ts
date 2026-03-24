export * from './listing-taxonomy';

import { STANDARD_CATEGORY_SEEDS } from './listing-taxonomy';

type ListingAttributes = Record<string, string | number | boolean>;

export interface User {
  id: string;
  phone: string;
  email?: string;
  role?: 'USER' | 'ADMIN' | 'WORKSHOP_MANAGER' | 'POLICE_OFFICER';
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
  user?: Pick<User, 'id' | 'name' | 'city' | 'area' | 'verified' | 'createdAt' | 'updatedAt'>;
  title: string;
  description: string;
  price: number;
  category: Category;
  categoryId: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  attributes?: ListingAttributes;
  images: string[];
  videos?: string[];
  condition: 'NEW' | 'USED';
  storeType?: 'ONLINE' | 'ROAD';
  isStore?: boolean;
  isFeatured?: boolean;
  city: string;
  area?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  isNearby?: boolean;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SOLD' | 'DELETED';
  inspectionStatus?:
    | 'NONE'
    | 'REQUESTED'
    | 'BOOKED'
    | 'WORKSHOP_VERIFIED'
    | 'POLICE_VERIFIED'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED';
  isInspectionApproved?: boolean;
  inspectionApprovedAt?: string;
  inspectionBadgeLabel?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopPartner {
  id: string;
  name: string;
  city: string;
  address: string;
  contact: string;
  active: boolean;
}

export interface InspectionReport {
  id: string;
  inspectionRequestId: string;
  vehicleInfo: Record<string, string | number | boolean>;
  ownerVerification: Record<string, string | number | boolean>;
  avlsVerification: Record<string, string | number | boolean>;
  mechanicalChecklist: Record<string, string | number | boolean>;
  bodyChecklist: Record<string, string | number | boolean>;
  interiorChecklist: Record<string, string | number | boolean>;
  tyreChecklist: Record<string, string | number | boolean>;
  evidencePhotos: string[];
  formPageFrontUrl?: string;
  formPageBackUrl?: string;
  overallRating?: number;
  verdict?: 'RECOMMENDED' | 'CAUTION' | 'NOT_RECOMMENDED';
  signatures: Record<string, string | boolean | null>;
  stamps: Record<string, string | boolean | null>;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionRequest {
  id: string;
  listingId: string;
  sellerId: string;
  workshopPartnerId?: string;
  status:
    | 'REQUESTED'
    | 'BOOKED'
    | 'WORKSHOP_VERIFIED'
    | 'POLICE_VERIFIED'
    | 'SUBMITTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED';
  bookedDate?: string;
  offlineFee: number;
  workshopPayout: number;
  tgmgCommission: number;
  offlinePaymentAcknowledged: boolean;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
  listing?: Pick<
    Listing,
    | 'id'
    | 'title'
    | 'city'
    | 'subcategorySlug'
    | 'subcategoryName'
    | 'inspectionStatus'
    | 'isInspectionApproved'
    | 'inspectionApprovedAt'
    | 'inspectionBadgeLabel'
  > & { category?: Pick<Category, 'slug' | 'name'> };
  workshopPartner?: WorkshopPartner;
  report?: InspectionReport;
  auditLogs?: InspectionAuditLog[];
}

export interface InspectionAuditLog {
  id: string;
  inspectionRequestId: string;
  actorUserId?: string;
  actorRole?: 'USER' | 'ADMIN' | 'WORKSHOP_MANAGER' | 'POLICE_OFFICER';
  action: string;
  note?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface ListingMessage {
  id: string;
  threadId: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'city' | 'verified'>;
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
  user?: Pick<User, 'id' | 'name' | 'city' | 'verified'>;
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
  type: 'contact' | 'saved_update' | 'new_listing';
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationPreferences {
  contacts: boolean;
  savedUpdates: boolean;
  newListings: boolean;
  pushEnabled: boolean;
}

export interface SavedSearch {
  id: string;
  label?: string | null;
  q?: string | null;
  category?: string | null;
  city?: string | null;
  condition?: 'NEW' | 'USED' | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  alertsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDashboardPoint {
  label: string;
  views: number;
  contacts: number;
  saves: number;
  listings: number;
}

export interface ListingDashboardFunnel {
  views: number;
  contacts: number;
  saves: number;
  sold: number;
}

export interface ListingDashboard {
  totalViews: number;
  totalContacts: number;
  activeListings: number;
  soldListings: number;
  inactiveListings: number;
  featuredListings: number;
  averageViewsPerListing: number;
  averageContactsPerListing: number;
  contactRate: number;
  sellThroughRate: number;
  recentLeads: number;
  funnel: ListingDashboardFunnel;
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
