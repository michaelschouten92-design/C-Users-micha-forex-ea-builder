import useSWR, { SWRConfiguration, mutate } from "swr";
import useSWRMutation from "swr/mutation";
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
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
};

// ============================================
// CUSTOM HOOKS
// ============================================

// Hook for fetching projects list
export function useProjects() {
  return useSWR<{
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { versions: number };
  }[]>("/api/projects", fetcher);
}

// Hook for fetching a single project
export function useProject(projectId: string | null) {
  return useSWR<{
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }>(projectId ? `/api/projects/${projectId}` : null, fetcher);
}

// Hook for fetching project versions
export function useProjectVersions(projectId: string | null) {
  return useSWR<{
    id: string;
    versionNo: number;
    createdAt: string;
    buildJson: unknown;
  }[]>(projectId ? `/api/projects/${projectId}/versions` : null, fetcher);
}

// Hook for fetching user subscription
export function useSubscription() {
  return useSWR<{
    tier: "FREE" | "STARTER" | "PRO";
    status: string;
    currentPeriodEnd: string | null;
  }>("/api/subscription", fetcher, {
    revalidateOnFocus: false,
  });
}

// Hook for creating a project
export function useCreateProject() {
  return useSWRMutation("/api/projects", mutationFetcher<{ id: string }>);
}

// Hook for updating a project
export function useUpdateProject(projectId: string) {
  return useSWRMutation(
    `/api/projects/${projectId}`,
    async (url: string, { arg }: { arg: { name?: string; description?: string | null } }) => {
      return mutationFetcher(url, { arg: { method: "PATCH", body: arg } });
    }
  );
}

// Hook for deleting a project
export function useDeleteProject(projectId: string) {
  return useSWRMutation(
    `/api/projects/${projectId}`,
    async (url: string) => {
      return mutationFetcher(url, { arg: { method: "DELETE" } });
    }
  );
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

export function invalidateProjects() {
  return mutate("/api/projects");
}

export function invalidateProject(projectId: string) {
  return mutate(`/api/projects/${projectId}`);
}

export function invalidateProjectVersions(projectId: string) {
  return mutate(`/api/projects/${projectId}/versions`);
}

export function invalidateSubscription() {
  return mutate("/api/subscription");
}

// Re-export SWR utilities
export { mutate };
