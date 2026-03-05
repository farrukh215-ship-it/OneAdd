import { marketplaceCategoryCatalog } from "@aikad/shared";
import {
  ChatMessage,
  ChatThread,
  Listing,
  ListingOffersResponse,
  MarketplaceCategory,
  SearchSuggestion,
  SellerOverviewMetrics
} from "./types";
import { resolveMediaUrl } from "./media-url";

function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? `${window.location.origin}/api`;
  }

  const internal = process.env.INTERNAL_API_URL?.trim();
  if (internal) {
    return internal;
  }

  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi && /^https?:\/\//i.test(publicApi)) {
    return publicApi;
  }

  return "http://api:3001";
}

const API_BASE_URL = resolveApiBaseUrl();
const TOKEN_KEY = "aikad_access_token";
const SESSION_TOKEN_KEY = "aikad_access_token_session";
export const AUTH_TOKEN_CHANGED_EVENT = "aikad-auth-changed";

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY) ?? ""
  );
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

function setToken(token: string, persist = true) {
  if (typeof window === "undefined") {
    return;
  }
  if (persist) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
    return;
  }

  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (init?.auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Request failed: ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return (await response.json()) as T;
}

type ListingsPage = {
  items: Listing[];
  nextCursor: string | null;
};

export type VideoFeedItem = {
  listingId: string;
  videoUrl: string;
  title: string;
  price: string | number;
  currency: string;
};

function normalizeListingsPage(payload: unknown): ListingsPage {
  if (Array.isArray(payload)) {
    return { items: payload as Listing[], nextCursor: null };
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "items" in payload &&
    Array.isArray((payload as { items: unknown }).items)
  ) {
    const typed = payload as { items: Listing[]; nextCursor?: string | null };
    return {
      items: typed.items,
      nextCursor: typed.nextCursor ?? null
    };
  }

  return { items: [], nextCursor: null };
}

function normalizeVideoFeed(payload: unknown): VideoFeedItem[] {
  const source = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        "items" in payload &&
        Array.isArray((payload as { items: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];

  return source
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }
      const listingId =
        typeof (item as { listingId?: unknown }).listingId === "string"
          ? (item as { listingId: string }).listingId
          : typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : "";
      const videoUrl =
        typeof (item as { videoUrl?: unknown }).videoUrl === "string"
          ? (item as { videoUrl: string }).videoUrl
          : "";
      const title =
        typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title
          : "Listing";
      const price =
        typeof (item as { price?: unknown }).price === "number" ||
        typeof (item as { price?: unknown }).price === "string"
          ? ((item as { price: string | number }).price ?? "")
          : "";
      const currency =
        typeof (item as { currency?: unknown }).currency === "string"
          ? (item as { currency: string }).currency
          : "PKR";

      if (!listingId || !videoUrl) {
        return null;
      }

      return { listingId, videoUrl, title, price, currency };
    })
    .filter((item): item is VideoFeedItem => Boolean(item));
}

function normalizeListing(listing: Listing): Listing {
  return {
    ...listing,
    media: (listing.media ?? []).map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url)
    }))
  };
}

function normalizeListingList(listings: Listing[]) {
  return listings.map(normalizeListing);
}

function listingToVideoItem(listing: Listing): VideoFeedItem | null {
  const video = listing.media.find(
    (item) => item.type === "VIDEO" && (item.durationSec ?? 0) <= 30
  );
  if (!video?.url) {
    return null;
  }
  return {
    listingId: listing.id,
    videoUrl: video.url,
    title: listing.title,
    price: listing.price,
    currency: listing.currency
  };
}

export async function getFeedListings() {
  const listings = await apiRequest<Listing[]>("/listings/feed");
  return normalizeListingList(listings);
}

export async function getCategoryCatalog() {
  try {
    return await apiRequest<MarketplaceCategory[]>("/listings/categories");
  } catch {
    return marketplaceCategoryCatalog.map((root) => ({
      id: root.slug,
      slug: root.slug,
      name: root.name,
      icon: root.icon,
      accent: root.accent,
      listingCount: 0,
      subcategoryCount: root.subcategories.length,
      subcategories: root.subcategories.map((item) => ({
        id: item.slug,
        slug: item.slug,
        name: item.name,
        parentSlug: root.slug,
        parentName: root.name,
        listingCount: 0
      }))
    }));
  }
}

export async function getVideoFeed() {
  try {
    const payload = await apiRequest<unknown>("/feed/videos");
    const normalized = normalizeVideoFeed(payload);
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Fallback to listings/feed if dedicated video feed endpoint is unavailable.
  }

  const listings = await getFeedListings();
  return listings
    .map(listingToVideoItem)
    .filter((item): item is VideoFeedItem => Boolean(item));
}

export async function getRecentListingsPage(cursor?: string | null) {
  if (cursor) {
    return { items: [], nextCursor: null };
  }

  const items = await getFeedListings();
  return { items, nextCursor: null };
}

export async function searchListings(query: string) {
  const listings = await apiRequest<Listing[]>(`/listings/search?q=${encodeURIComponent(query)}`);
  return normalizeListingList(listings);
}

export type SearchFilters = {
  query: string;
  category: string;
  city: string;
  minPrice?: number;
  maxPrice?: number;
  condition: string;
  negotiable?: boolean;
  limit?: number;
};

export async function searchListingsWithFilters(filters: SearchFilters) {
  const params = new URLSearchParams();
  params.set("q", filters.query.trim());
  params.set("category", filters.category);
  params.set("limit", String(filters.limit ?? 100));

  if (filters.city.trim()) {
    params.set("city", filters.city.trim());
  }
  if (typeof filters.minPrice === "number") {
    params.set("minPrice", String(filters.minPrice));
  }
  if (typeof filters.maxPrice === "number") {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.condition) {
    params.set("condition", filters.condition);
  }
  if (typeof filters.negotiable === "boolean") {
    params.set("negotiable", String(filters.negotiable));
  }

  const listings = await apiRequest<Listing[]>(`/listings/search?${params.toString()}`);
  return normalizeListingList(listings);
}

export async function semanticSearchListingsWithFilters(filters: SearchFilters) {
  const params = new URLSearchParams();
  params.set("q", filters.query.trim());
  params.set("category", filters.category);
  params.set("limit", String(filters.limit ?? 100));

  if (filters.city.trim()) {
    params.set("city", filters.city.trim());
  }
  if (typeof filters.minPrice === "number") {
    params.set("minPrice", String(filters.minPrice));
  }
  if (typeof filters.maxPrice === "number") {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (typeof filters.negotiable === "boolean") {
    params.set("negotiable", String(filters.negotiable));
  }

  const listings = await apiRequest<Listing[]>(`/listings/semantic-search?${params.toString()}`);
  return normalizeListingList(listings);
}

export async function getSearchSuggestions(query: string, limit = 20) {
  const params = new URLSearchParams();
  params.set("q", query.trim());
  params.set("limit", String(limit));

  const result = await apiRequest<{ query: string; items: SearchSuggestion[] }>(
    `/search/suggestions?${params.toString()}`,
    { auth: true }
  );
  return result.items;
}

export async function fetchListingById(id: string) {
  const listing = await apiRequest<Listing>(`/listings/${id}`);
  return normalizeListing(listing);
}

export async function fetchListingOffers(id: string, limit = 15) {
  return apiRequest<ListingOffersResponse>(`/listings/${id}/offers?limit=${limit}`, {
    auth: true
  });
}

export async function requestOtp(phone: string, options?: { forSignup?: boolean }) {
  return apiRequest<{ requestId: string; expiresAt: string; devOtp?: string }>(
    "/auth/otp/request",
    {
      method: "POST",
      body: JSON.stringify({
        phone,
        ...(options?.forSignup ? { forSignup: true } : {})
      })
    }
  );
}

export async function verifyOtp(payload: {
  requestId: string;
  phone: string;
  otp: string;
}) {
  return apiRequest<{ verificationToken: string }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function loginWithOtp(payload: {
  email: string;
  phone: string;
  otpVerificationToken: string;
}, options?: { rememberMe?: boolean }) {
  const result = await apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      phone: payload.phone,
      otpVerificationToken: payload.otpVerificationToken
    })
  });

  setToken(result.accessToken, options?.rememberMe ?? true);
  return result;
}

export async function loginWithPassword(
  payload: { email: string; password: string },
  options?: { rememberMe?: boolean }
) {
  const result = await apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      password: payload.password
    })
  });

  setToken(result.accessToken, options?.rememberMe ?? true);
  return result;
}

export async function requestPasswordReset(payload: { email: string; phone: string }) {
  return apiRequest<{ eligible: boolean; phone: string }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyPasswordReset(payload: {
  email: string;
  phone: string;
  idToken: string;
}) {
  return apiRequest<{ resetToken: string }>("/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function confirmPasswordReset(payload: {
  resetToken: string;
  newPassword: string;
}) {
  return apiRequest<{ success: true }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function requestListingPublishOtp() {
  return apiRequest<{ phone: string }>("/auth/listing-otp/request", {
    method: "POST",
    auth: true
  });
}

export async function verifyListingPublishOtp(payload: { idToken: string }) {
  return apiRequest<{ publishOtpVerificationToken: string }>("/auth/listing-otp/verify", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function signup(payload: {
  fullName: string;
  fatherName: string;
  cnic: string;
  phone: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  otpVerificationToken: string;
}) {
  const result = await apiRequest<{ accessToken: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      city: "Unknown"
    })
  });

  setToken(result.accessToken);
  return result;
}

export async function verifyFirebaseLogin(
  payload: {
    idToken: string;
    fullName?: string;
    fatherName?: string;
    cnic?: string;
    email: string;
    password?: string;
    city?: string;
    dateOfBirth?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
  },
  options?: { rememberMe?: boolean }
) {
  const result = await apiRequest<{
    accessToken: string;
    user: { id: string; fullName: string; cnic: string; phone: string; email: string };
  }>("/auth/firebase/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setToken(result.accessToken, options?.rememberMe ?? true);
  return result;
}

export async function createListing(payload: Record<string, unknown>) {
  const listing = await apiRequest<Listing>("/listings", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
  return normalizeListing(listing);
}

export async function updateListing(
  listingId: string,
  payload: Record<string, unknown>
) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload)
  });
  return normalizeListing(listing);
}

export async function uploadListingMedia(
  listingId: string,
  media: Array<{ type: "IMAGE" | "VIDEO"; url: string; durationSec?: number }>
) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}/media`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ media })
  });
  return normalizeListing(listing);
}

export async function uploadMediaFile(params: {
  file: File;
  mediaType: "IMAGE" | "VIDEO";
  durationSec?: number;
}) {
  const token = getToken();
  if (!token) {
    throw new ApiError("Login required.", 401);
  }

  const form = new FormData();
  form.append("file", params.file);
  form.append("mediaType", params.mediaType);
  if (typeof params.durationSec === "number" && Number.isFinite(params.durationSec)) {
    form.append("durationSec", String(params.durationSec));
  }

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form,
    cache: "no-store"
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Upload failed: ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  const payload = (await response.json()) as {
    mediaType: "IMAGE" | "VIDEO";
    durationSec: number | null;
    url: string;
    filename: string;
  };
  return {
    ...payload,
    url: resolveMediaUrl(payload.url)
  };
}

export async function activateListing(listingId: string) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}/activate`, {
    method: "POST",
    auth: true
  });
  return normalizeListing(listing);
}

export async function relistListing(listingId: string) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}/relist`, {
    method: "POST",
    auth: true
  });
  return normalizeListing(listing);
}

export async function markListingSold(listingId: string) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}/mark-sold`, {
    method: "POST",
    auth: true
  });
  return normalizeListing(listing);
}

export async function deactivateListing(listingId: string) {
  const listing = await apiRequest<Listing>(`/listings/${listingId}/deactivate`, {
    method: "POST",
    auth: true
  });
  return normalizeListing(listing);
}

export async function getMyListings() {
  const listings = await apiRequest<Listing[]>("/listings/me", {
    auth: true
  });
  return normalizeListingList(listings);
}

export async function getSavedListings(limit = 40) {
  const payload = await apiRequest<{ items: Listing[]; total: number }>(`/users/me/saved?limit=${limit}`, {
    auth: true
  });
  return {
    ...payload,
    items: normalizeListingList(payload.items)
  };
}

export async function saveListing(listingId: string) {
  return apiRequest<{ saved: boolean }>(`/users/me/saved/${listingId}`, {
    method: "POST",
    auth: true
  });
}

export async function unsaveListing(listingId: string) {
  return apiRequest<{ saved: boolean }>(`/users/me/saved/${listingId}`, {
    method: "DELETE",
    auth: true
  });
}

export async function getRecentlyViewedListings(limit = 40) {
  const payload = await apiRequest<{ items: Listing[]; total: number }>(`/users/me/recent?limit=${limit}`, {
    auth: true
  });
  return {
    ...payload,
    items: normalizeListingList(payload.items)
  };
}

export async function trackRecentlyViewedListing(listingId: string) {
  return apiRequest<{ tracked: boolean; viewedAt: string }>(`/users/me/recent/${listingId}`, {
    method: "POST",
    auth: true
  });
}

export async function getSellerOverviewMetrics() {
  return apiRequest<SellerOverviewMetrics>("/analytics/seller/overview", {
    auth: true
  });
}

export async function getMe() {
  return apiRequest<{
    id: string;
    fullName: string;
    fatherName: string;
    cnic: string;
    phone: string;
    email: string;
    city: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    profilePhotoUrl: string | null;
  }>("/auth/me", {
    auth: true
  });
}

export async function getChatThreads() {
  return apiRequest<ChatThread[]>("/chat/threads", {
    auth: true
  });
}

export async function upsertChatThread(listingId: string) {
  return apiRequest<ChatThread>("/chat/threads", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ listingId })
  });
}

export async function getChatMessages(threadId: string) {
  return apiRequest<ChatMessage[]>(`/chat/threads/${threadId}/messages`, {
    auth: true
  });
}

export async function createListingReport(payload: {
  targetListingId: string;
  targetUserId?: string;
  reason: string;
}) {
  return apiRequest<{ id: string; reason: string }>("/reports", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function sendChatMessage(threadId: string, content: string) {
  try {
    return await apiRequest<ChatMessage>("/chat/messages", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ threadId, content })
    });
  } catch {
    return apiRequest<ChatMessage>(`/chat/threads/${threadId}/messages`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ content })
    });
  }
}
