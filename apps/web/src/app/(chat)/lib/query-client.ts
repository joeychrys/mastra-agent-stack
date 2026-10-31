import { QueryClient } from "@tanstack/react-query";

/**
 * Shared client for the Mastra auth-token cache. `getAuthToken()` and
 * `useAuthToken()` (`@/hooks/use-auth-token`) both bind to this instance
 * explicitly, so no route-level `QueryClientProvider` is required.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s — threads don't change often
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
