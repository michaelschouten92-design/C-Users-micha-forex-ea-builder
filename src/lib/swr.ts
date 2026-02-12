import { SWRConfiguration } from "swr";
import { getCsrfHeaders } from "./api-client";

// Default fetcher for GET requests
export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
};

// Fetcher for POST/PUT/PATCH/DELETE requests (mutations)
export async function mutationFetcher<T>(
  url: string,
  { arg }: { arg: { method?: string; body?: unknown } }
): Promise<T> {
  const { method = "POST", body } = arg;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getCsrfHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = new Error("An error occurred while mutating the data.");
    const data = await res.json().catch(() => ({}));
    (error as Error & { info?: unknown; status?: number }).info = data;
    (error as Error & { info?: unknown; status?: number }).status = res.status;
    throw error;
  }

  return res.json();
}

// Default SWR configuration
export const defaultSwrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000,
  errorRetryCount: 3,
};
