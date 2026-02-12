"use client";

/**
 * API client with automatic CSRF token handling
 *
 * Usage:
 *   import { apiClient } from "@/lib/api-client";
 *
 *   const data = await apiClient.post("/api/projects", { name: "My Project" });
 *   const project = await apiClient.patch(`/api/projects/${id}`, { name: "Updated" });
 *   await apiClient.delete(`/api/projects/${id}`);
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === CSRF_COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

/**
 * API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: string }).error)
        : `API error: ${status}`;
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Make an API request with CSRF token
 */
async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCsrfToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Add CSRF token for state-changing requests
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method || "GET")) {
    (headers as Record<string, string>)[CSRF_HEADER_NAME] = csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

/**
 * API client with convenience methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    return request<T>(url, { ...options, method: "GET" });
  },

  /**
   * POST request
   */
  post<T = unknown>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put<T = unknown>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch<T = unknown>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    return request<T>(url, { ...options, method: "DELETE" });
  },
};

/**
 * Helper to get CSRF headers for custom fetch calls
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}
