"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { mastraFetch } from "./internal/fetch";
import type { MastraMemoryConfig, MastraMemoryMessage, MastraThread } from "./types";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

/**
 * Query key factory for Mastra memory queries.
 *
 * Scoped by `baseUrl` + `agentId` + `resourceId` so multiple hook instances
 * with different configs don't collide in the same QueryClient.
 *
 * @example
 * ```ts
 * // Invalidate all memory queries for a resource
 * queryClient.invalidateQueries({ queryKey: memoryKeys.all(baseUrl, agentId, resourceId) });
 *
 * // Invalidate the thread list only
 * queryClient.invalidateQueries({ queryKey: memoryKeys.threads(baseUrl, agentId, resourceId) });
 * ```
 */
export const memoryKeys = {
  all: (baseUrl: string, agentId: string, resourceId: string) =>
    ["mastra-memory", baseUrl, agentId, resourceId] as const,
  threads: (baseUrl: string, agentId: string, resourceId: string) =>
    [...memoryKeys.all(baseUrl, agentId, resourceId), "threads"] as const,
  thread: (baseUrl: string, agentId: string, resourceId: string, threadId: string) =>
    [...memoryKeys.all(baseUrl, agentId, resourceId), "thread", threadId] as const,
  messages: (baseUrl: string, agentId: string, resourceId: string, threadId: string) =>
    [...memoryKeys.all(baseUrl, agentId, resourceId), "messages", threadId] as const,
};

// ---------------------------------------------------------------------------
// useMastraMemory
// ---------------------------------------------------------------------------

/**
 * Hook for interacting with Mastra's memory API (thread CRUD, messages).
 *
 * Uses TanStack Query for caching, deduplication, loading/error states,
 * and automatic cache invalidation on mutations.
 *
 * Talks directly to the Mastra server's built-in `/api/memory/*` endpoints.
 *
 * @example
 * ```tsx
 * const {
 *   threads,          // UseQueryResult — .data, .isLoading, .error
 *   messages,         // UseQueryResult (enabled when threadId is set)
 *   createThread,     // UseMutationResult — .mutate(), .mutateAsync()
 *   updateThread,     // UseMutationResult
 *   deleteThread,     // UseMutationResult
 *   currentThreadId,
 *   setCurrentThreadId,
 * } = useMastraMemory({
 *   baseUrl: "http://localhost:4111",
 *   agentId: "weatherAgent",
 *   resourceId: "user-123",
 * });
 *
 * // List threads (automatic on mount)
 * if (threads.isLoading) return <Spinner />;
 * threads.data?.map(t => <ThreadItem key={t.id} thread={t} />);
 *
 * // Create a thread
 * createThread.mutate({ title: "New Chat" });
 *
 * // Select a thread to load its messages
 * setCurrentThreadId(threadId);
 * ```
 */
export function useMastraMemory(config: MastraMemoryConfig) {
  const { baseUrl, agentId, resourceId, headers } = config;
  const apiBase = `${baseUrl}/api/memory`;
  const queryClient = useQueryClient();

  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /** All threads for this resource. Fetches automatically on mount. */
  const threads = useQuery({
    queryKey: memoryKeys.threads(baseUrl, agentId, resourceId),
    queryFn: async () => {
      const result = await mastraFetch<{ threads: MastraThread[] }>(
        `${apiBase}/threads?agentId=${encodeURIComponent(agentId)}&resourceId=${encodeURIComponent(resourceId)}`,
        headers,
      );
      return result.threads;
    },
  });

  /** Single thread by ID. Enabled only when `currentThreadId` is set. */
  const thread = useQuery({
    queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, currentThreadId ?? ""),
    queryFn: async () => {
      return mastraFetch<MastraThread>(
        `${apiBase}/threads/${currentThreadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
      );
    },
    enabled: !!currentThreadId,
  });

  /** Messages for the current thread. Enabled only when `currentThreadId` is set. */
  const messages = useQuery({
    queryKey: memoryKeys.messages(baseUrl, agentId, resourceId, currentThreadId ?? ""),
    queryFn: async () => {
      const result = await mastraFetch<{ messages: MastraMemoryMessage[] }>(
        `${apiBase}/threads/${currentThreadId}/messages?agentId=${encodeURIComponent(agentId)}`,
        headers,
      );
      return result.messages;
    },
    enabled: !!currentThreadId,
    staleTime: 5_000,
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /** Create a new thread. Invalidates the thread list on success. */
  const createThread = useMutation({
    mutationFn: async (variables?: { metadata?: Record<string, unknown> }) => {
      return mastraFetch<MastraThread>(
        `${apiBase}/threads?agentId=${encodeURIComponent(agentId)}`,
        headers,
        {
          method: "POST",
          body: JSON.stringify({ resourceId, metadata: variables?.metadata }),
        },
      );
    },
    onSuccess: (thread) => {
      setCurrentThreadId(thread.id);
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId),
      });
    },
  });

  /** Update a thread (title, metadata). Invalidates the list + detail caches. */
  const updateThread = useMutation({
    mutationFn: async (variables: {
      threadId: string;
      update: { title?: string; metadata?: Record<string, unknown> };
    }) => {
      return mastraFetch<MastraThread>(
        `${apiBase}/threads/${variables.threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
        {
          method: "PATCH",
          body: JSON.stringify(variables.update),
        },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId),
      });
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, variables.threadId),
      });
    },
  });

  /** Delete a thread. Removes it from all caches. */
  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      await mastraFetch<void>(
        `${apiBase}/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
        { method: "DELETE" },
      );
      return threadId;
    },
    onSuccess: (threadId) => {
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
      }
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId),
      });
      queryClient.removeQueries({
        queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, threadId),
      });
      queryClient.removeQueries({
        queryKey: memoryKeys.messages(baseUrl, agentId, resourceId, threadId),
      });
    },
  });

  // -------------------------------------------------------------------------
  // Imperative helpers (for cases where the caller needs a direct promise)
  // -------------------------------------------------------------------------

  /** Fetch a single thread by ID (imperative, bypasses the reactive query). */
  const getThread = useCallback(
    async (threadId: string): Promise<MastraThread> => {
      return mastraFetch<MastraThread>(
        `${apiBase}/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
      );
    },
    [apiBase, agentId, headers],
  );

  /** Fetch messages for a thread (imperative, bypasses the reactive query). */
  const getMessages = useCallback(
    async (threadId: string): Promise<MastraMemoryMessage[]> => {
      const result = await mastraFetch<{ messages: MastraMemoryMessage[] }>(
        `${apiBase}/threads/${threadId}/messages?agentId=${encodeURIComponent(agentId)}`,
        headers,
      );
      return result.messages;
    },
    [apiBase, agentId, headers],
  );

  return {
    // Reactive state
    currentThreadId,
    setCurrentThreadId,

    // Queries (UseQueryResult — .data, .isLoading, .isError, .error, etc.)
    threads,
    thread,
    messages,

    // Mutations (UseMutationResult — .mutate(), .mutateAsync(), .isPending, etc.)
    createThread,
    updateThread,
    deleteThread,

    // Imperative helpers
    getThread,
    getMessages,
  };
}
