import { ChatMessage, ChatThread, Listing } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "aikad_access_token";
const SESSION_TOKEN_KEY = "aikad_access_token_session";

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
}

function setToken(token: string, persist = true) {
  if (typeof window === "undefined") {
    return;
  }
  if (persist) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
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
  return apiRequest<Listing[]>("/listings/feed");
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
  return apiRequest<Listing[]>(`/listings/search?q=${encodeURIComponent(query)}`);
}

export type SearchFilters = {
  query: string;
  category: string;
  city: string;
  minPrice?: number;
  maxPrice?: number;
  condition: string;
};

export async function searchListingsWithFilters(filters: SearchFilters) {
  const params = new URLSearchParams();
  params.set("q", filters.query.trim());
  params.set("category", filters.category);

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

  return apiRequest<Listing[]>(`/listings/search?${params.toString()}`);
}

export async function fetchListingById(id: string) {
  return apiRequest<Listing>(`/listings/${id}`);
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
  return apiRequest<Listing>("/listings", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function uploadListingMedia(
  listingId: string,
  media: Array<{ type: "IMAGE" | "VIDEO"; url: string; durationSec?: number }>
) {
  return apiRequest<Listing>(`/listings/${listingId}/media`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ media })
  });
}

export async function activateListing(listingId: string) {
  return apiRequest<Listing>(`/listings/${listingId}/activate`, {
    method: "POST",
    auth: true
  });
}

export async function getMyListings() {
  return apiRequest<Listing[]>("/listings/me", {
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
