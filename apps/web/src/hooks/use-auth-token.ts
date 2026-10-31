import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/app/(chat)/lib/query-client";
import { authClient } from "@/lib/auth-client";

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const authTokenKeys = {
  token: ["auth", "token"] as const,
};

// ---------------------------------------------------------------------------
// Token fetch function (shared between React hook and imperative access)
// ---------------------------------------------------------------------------

async function fetchToken(): Promise<string> {
  const { data, error } = await authClient.token();
  if (error || !data?.token) {
    throw new Error(error?.message ?? "Failed to obtain JWT token");
  }
  return data.token;
}

// ---------------------------------------------------------------------------
// React hook — caches the JWT via TanStack Query
// ---------------------------------------------------------------------------

/**
 * Fetches and caches a JWT from Better Auth.
 *
 * The token is refreshed automatically before it expires.
 * Better Auth JWTs default to 15 minutes, so we refetch at ~12 minutes.
 *
 * Bound explicitly to the shared `queryClient` singleton (not the nearest
 * `QueryClientProvider`), so this hook and `getAuthToken()` always share one
 * token cache regardless of where the component renders.
 */
export function useAuthToken() {
  return useQuery(
    {
      queryKey: authTokenKeys.token,
      queryFn: fetchToken,
      staleTime: 12 * 60 * 1000, // 12 min — refresh before 15 min expiry
      refetchInterval: 12 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 2,
    },
    queryClient,
  );
}

// ---------------------------------------------------------------------------
// Imperative access — for code running outside of React (e.g. adapters)
// ---------------------------------------------------------------------------

/**
 * Returns the cached JWT token from the query cache, fetching a fresh one
 * if the cache is empty or stale.
 *
 * Safe to call outside of React components (e.g. in the thread adapter).
 */
export async function getAuthToken(): Promise<string> {
  return queryClient.fetchQuery({
    queryKey: authTokenKeys.token,
    queryFn: fetchToken,
    staleTime: 12 * 60 * 1000,
    retry: 2, // fetchQuery defaults to 0 — retry for transient 401s during hydration
    retryDelay: 500,
  });
}
