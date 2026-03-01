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

type AdminReport = {
  id: string;
  status: string;
  reason?: string;
  reporter?: { email?: string };
  targetListing?: { id: string; title?: string } | null;
  targetUser?: { id: string; email?: string } | null;
  createdAt?: string;
};

type AdminActionPayload = {
  reportId?: string;
  action: "REVIEW" | "RESOLVE" | "REJECT" | "SUSPEND_USER" | "DEACTIVATE_LISTING";
  userId?: string;
  listingId?: string;
  note?: string;
};

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
  getAdminReports: async () => {
    try {
      return await request<AdminReport[]>("/admin/reports");
    } catch {
      return request<AdminReport[]>("/reports/queue");
    }
  },
  applyAdminAction: async (payload: AdminActionPayload) => {
    try {
      return await request("/admin/actions", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } catch {
      if (payload.reportId && (payload.action === "REVIEW" || payload.action === "RESOLVE" || payload.action === "REJECT")) {
        const mappedStatus =
          payload.action === "REVIEW"
            ? "IN_REVIEW"
            : payload.action === "RESOLVE"
              ? "RESOLVED"
              : "REJECTED";
        return request(`/reports/${payload.reportId}/action`, {
          method: "PATCH",
          body: JSON.stringify({ status: mappedStatus })
        });
      }

      if (payload.action === "SUSPEND_USER" && payload.userId) {
        return request(`/reports/users/${payload.userId}/suspend`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: true })
        });
      }

      if (payload.action === "DEACTIVATE_LISTING" && payload.listingId) {
        return request(`/reports/listings/${payload.listingId}/deactivate`, {
          method: "PATCH"
        });
      }

      throw new Error("Admin action failed.");
    }
  },
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
