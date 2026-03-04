import { marketplaceCategoryCatalog } from "@aikad/shared";
import type {
  ChatMessage,
  ChatThread,
  Listing,
  MarketplaceCategory
} from "../types";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  demoToken?: string;
};
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://10.0.2.2:3001";
let AUTH_TOKEN = extra.demoToken ?? "";
const AUTH_TOKEN_KEY = "aikad_mobile_access_token";
const authTokenListeners = new Set<(token: string) => void>();

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    cnic: string;
    phone: string;
    email: string;
  };
};

export type VideoFeedItem = {
  listingId: string;
  videoUrl: string;
  title: string;
  price: string | number;
  currency: string;
};

export async function setAuthToken(token: string) {
  AUTH_TOKEN = token;
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  authTokenListeners.forEach((listener) => listener(AUTH_TOKEN));
}

export function getAuthToken() {
  return AUTH_TOKEN;
}

export async function clearAuthToken() {
  AUTH_TOKEN = "";
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  authTokenListeners.forEach((listener) => listener(AUTH_TOKEN));
}

export async function hydrateAuthToken() {
  if (AUTH_TOKEN) {
    authTokenListeners.forEach((listener) => listener(AUTH_TOKEN));
    return AUTH_TOKEN;
  }
  const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) {
    AUTH_TOKEN = stored;
    authTokenListeners.forEach((listener) => listener(AUTH_TOKEN));
  }
  return AUTH_TOKEN;
}

export function subscribeAuthToken(listener: (token: string) => void) {
  authTokenListeners.add(listener);
  return () => {
    authTokenListeners.delete(listener);
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (AUTH_TOKEN) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
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
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getFeedListings() {
  return apiRequest<Listing[]>("/listings/feed");
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

function mapListingToVideoItem(listing: Listing): VideoFeedItem | null {
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

function normalizeVideoFeed(payload: unknown): VideoFeedItem[] {
  const list = Array.isArray(payload)
    ? payload
    : typeof payload === "object" &&
        payload !== null &&
        "items" in payload &&
        Array.isArray((payload as { items: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];

  return list
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

      if (!listingId || !videoUrl) {
        return null;
      }

      const title =
        typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title
          : "Listing";
      const price =
        typeof (item as { price?: unknown }).price === "string" ||
        typeof (item as { price?: unknown }).price === "number"
          ? (item as { price: string | number }).price
          : "";
      const currency =
        typeof (item as { currency?: unknown }).currency === "string"
          ? (item as { currency: string }).currency
          : "PKR";

      return { listingId, videoUrl, title, price, currency };
    })
    .filter((item): item is VideoFeedItem => Boolean(item));
}

export async function getVideoFeed() {
  try {
    const payload = await apiRequest<unknown>("/feed/videos");
    const normalized = normalizeVideoFeed(payload);
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Fallback to listings feed where dedicated reels feed is unavailable.
  }

  const listings = await getFeedListings();
  return listings
    .map(mapListingToVideoItem)
    .filter((item): item is VideoFeedItem => Boolean(item));
}

export async function getListings() {
  try {
    return await apiRequest<Listing[]>("/listings");
  } catch {
    return getFeedListings();
  }
}

export function searchListings(query: string) {
  return apiRequest<Listing[]>(`/listings/search?q=${encodeURIComponent(query)}`);
}

export type MobileSearchFilters = {
  query?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  negotiable?: boolean;
};

export function searchListingsWithFilters(filters: MobileSearchFilters) {
  const params = new URLSearchParams();
  if (filters.query?.trim()) {
    params.set("q", filters.query.trim());
  } else {
    params.set("q", "");
  }
  if (filters.category?.trim()) {
    params.set("category", filters.category.trim());
  }
  if (filters.city?.trim()) {
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

  return apiRequest<Listing[]>(`/listings/search?${params.toString()}`);
}

export function getListingById(id: string) {
  return apiRequest<Listing>(`/listings/${id}`);
}

export function createListing(payload: Record<string, unknown>) {
  return apiRequest<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function activateListing(listingId: string) {
  return apiRequest<Listing>(`/listings/${listingId}/activate`, {
    method: "POST"
  });
}

export function loginWithPassword(payload: { email: string; password: string }) {
  return apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function requestPasswordReset(payload: { email: string; phone: string }) {
  return apiRequest<{ eligible: boolean; phone: string }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function verifyPasswordReset(payload: {
  email: string;
  phone: string;
  idToken: string;
}) {
  return apiRequest<{ resetToken: string }>("/auth/password-reset/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function confirmPasswordReset(payload: { resetToken: string; newPassword: string }) {
  return apiRequest<{ success: true }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function requestListingPublishOtp() {
  return apiRequest<{ phone: string }>("/auth/listing-otp/request", {
    method: "POST"
  });
}

export function verifyListingPublishOtp(payload: { idToken: string }) {
  return apiRequest<{ publishOtpVerificationToken: string }>("/auth/listing-otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getMyListings() {
  return apiRequest<Listing[]>("/listings/me");
}

export function getChatThreads() {
  return apiRequest<ChatThread[]>("/chat/threads");
}

export function getChatMessages(threadId: string) {
  return apiRequest<ChatMessage[]>(`/chat/threads/${threadId}/messages`);
}

export function sendChatMessage(threadId: string, content: string) {
  return apiRequest<ChatMessage>(`/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export function upsertThread(listingId: string) {
  return apiRequest<ChatThread>("/chat/threads", {
    method: "POST",
    body: JSON.stringify({ listingId })
  });
}

export function registerDeviceToken(token: string, platform: "ANDROID" | "IOS" | "WEB") {
  return apiRequest("/notifications/device-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform })
  });
}

export function verifyFirebaseLogin(payload: {
  idToken: string;
  fullName?: string;
  fatherName?: string;
  cnic?: string;
  email: string;
  password?: string;
  city?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  profilePhotoUrl?: string;
}) {
  return apiRequest<AuthResponse>("/auth/firebase/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
