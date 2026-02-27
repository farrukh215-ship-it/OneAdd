import { ChatMessage, ChatThread, Listing } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "aikad_access_token";

export function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

function setToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
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
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getFeedListings() {
  return apiRequest<Listing[]>("/listings/feed");
}

export async function searchListings(query: string) {
  return apiRequest<Listing[]>(
    `/listings/search?q=${encodeURIComponent(query)}`
  );
}

export async function fetchListingById(id: string) {
  return apiRequest<Listing>(`/listings/${id}`);
}

export async function requestOtp(phone: string) {
  return apiRequest<{ requestId: string; expiresAt: string; devOtp?: string }>(
    "/auth/otp/request",
    {
      method: "POST",
      body: JSON.stringify({ phone })
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
  identifier: string;
  otpVerificationToken: string;
}) {
  const result = await apiRequest<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setToken(result.accessToken);
  return result;
}

export async function createListing(payload: Record<string, unknown>) {
  return apiRequest<Listing>("/listings", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload)
  });
}

export async function getMyListings() {
  return apiRequest<Listing[]>("/listings/me", {
    auth: true
  });
}

export async function getChatThreads() {
  return apiRequest<ChatThread[]>("/chat/threads", {
    auth: true
  });
}

export async function getChatMessages(threadId: string) {
  return apiRequest<ChatMessage[]>(`/chat/threads/${threadId}/messages`, {
    auth: true
  });
}

export async function sendChatMessage(threadId: string, content: string) {
  return apiRequest<ChatMessage>(`/chat/threads/${threadId}/messages`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ content })
  });
}
