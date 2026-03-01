import type { ChatMessage, ChatThread, Listing } from "../types";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  demoToken?: string;
};
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://10.0.2.2:3001";
let AUTH_TOKEN = extra.demoToken ?? "";

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

export function setAuthToken(token: string) {
  AUTH_TOKEN = token;
}

export function getAuthToken() {
  return AUTH_TOKEN;
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

export function getListingById(id: string) {
  return apiRequest<Listing>(`/listings/${id}`);
}

export function createListing(payload: Record<string, unknown>) {
  return apiRequest<Listing>("/listings", {
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
