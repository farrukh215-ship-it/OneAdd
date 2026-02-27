import type { ChatMessage, ChatThread, Listing } from "../types";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  demoToken?: string;
};
const API_BASE_URL = extra.apiUrl ?? "http://10.0.2.2:3001";
const AUTH_TOKEN = extra.demoToken ?? "";

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
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getFeedListings() {
  return apiRequest<Listing[]>("/listings/feed");
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
