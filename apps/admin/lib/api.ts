const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "aikad_admin_token";

export function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

function setToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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

export async function loginAdmin(payload: { identifier: string; password: string }) {
  const result = await request<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setToken(result.accessToken);
  return result;
}

export const adminApi = {
  getCategories: () => request<any[]>("/admin/categories"),
  createCategory: (payload: { name: string; slug: string; parentId?: string }) =>
    request("/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateCategory: (
    id: string,
    payload: { name: string; slug: string; parentId?: string }
  ) =>
    request(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  getListings: () => request<any[]>("/admin/listings"),
  getReportsQueue: () => request<any[]>("/reports/queue"),
  updateReportStatus: (id: string, status: string) =>
    request(`/reports/${id}/action`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  getUsers: () => request<any[]>("/admin/users"),
  suspendUser: (id: string, enabled: boolean) =>
    request(`/reports/users/${id}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  shadowBanUser: (id: string, enabled: boolean) =>
    request(`/reports/users/${id}/shadow-ban`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  deactivateListing: (id: string) =>
    request(`/reports/listings/${id}/deactivate`, {
      method: "PATCH"
    }),
  getFeatureFlags: () => request<any[]>("/admin/feature-flags"),
  toggleFeatureFlag: (key: string, enabled: boolean) =>
    request(`/admin/feature-flags/${key}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  getAuditLogs: () => request<any[]>("/admin/audit-logs")
};
