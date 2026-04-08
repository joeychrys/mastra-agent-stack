import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMastraMemory } from "../../src/useMastraMemory";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:4111";
const RESOURCE_ID = "test-user";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return QueryClientProvider({ client: queryClient, children });
  }

  return { Wrapper, queryClient };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMastraMemory — TanStack Query integration", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("should list threads on mount via useQuery", async () => {
    const mockThreads = [
      {
        id: "thread-1",
        resourceId: RESOURCE_ID,
        title: "First chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "thread-2",
        resourceId: RESOURCE_ID,
        title: "Second chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ threads: mockThreads }),
    } as Response);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMastraMemory({ baseUrl: BASE_URL, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    // Initially loading
    expect(result.current.threads.isLoading).toBe(true);

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    expect(result.current.threads.data).toHaveLength(2);
    expect(result.current.threads.data?.[0]?.id).toBe("thread-1");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/memory/threads?resourceId="),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("should create a thread and invalidate the list cache", async () => {
    const existingThreads = [
      {
        id: "thread-1",
        resourceId: RESOURCE_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const newThread = {
      id: "thread-new",
      resourceId: RESOURCE_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: { source: "test" },
    };

    const fetchMock = vi.mocked(global.fetch);

    // First call: initial thread list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ threads: existingThreads }),
    } as Response);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMastraMemory({ baseUrl: BASE_URL, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    // Set up mocks for create + refetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ thread: newThread }),
    } as Response);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ threads: [...existingThreads, newThread] }),
    } as Response);

    // Create a thread
    await act(async () => {
      await result.current.createThread.mutateAsync({ metadata: { source: "test" } });
    });

    // Should auto-set currentThreadId
    expect(result.current.currentThreadId).toBe("thread-new");

    // Wait for the invalidation refetch to complete
    await waitFor(() => expect(result.current.threads.data).toHaveLength(2));
  });

  it("should delete a thread and clean up caches", async () => {
    const threadOne = {
      id: "thread-1",
      resourceId: RESOURCE_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let deleted = false;
    const fetchMock = vi.mocked(global.fetch);

    // Dynamic mock — setCurrentThreadId triggers thread detail + messages
    // queries in addition to the list already fetched on mount.
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      // Thread list
      if (url.includes("/api/memory/threads?") && method === "GET") {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": "100" }),
          json: async () => ({ threads: deleted ? [] : [threadOne] }),
        } as Response;
      }

      // Messages
      if (url.includes("/threads/thread-1/messages")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": "100" }),
          json: async () => ({ messages: [] }),
        } as Response;
      }

      // DELETE
      if (url.includes("/threads/thread-1") && method === "DELETE") {
        deleted = true;
        return {
          ok: true,
          status: 204,
          headers: new Headers({ "content-length": "0" }),
          json: async () => ({}),
        } as Response;
      }

      // Single thread detail
      if (url.includes("/threads/thread-1")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": "100" }),
          json: async () => ({ thread: threadOne }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMastraMemory({ baseUrl: BASE_URL, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));
    expect(result.current.threads.data).toHaveLength(1);

    // Select the thread first (triggers thread detail + messages queries)
    act(() => {
      result.current.setCurrentThreadId("thread-1");
    });
    expect(result.current.currentThreadId).toBe("thread-1");

    // Wait for detail + messages to settle before deleting
    await waitFor(() => expect(result.current.thread.isSuccess).toBe(true));

    await act(async () => {
      await result.current.deleteThread.mutateAsync("thread-1");
    });

    // Should clear currentThreadId since the active thread was deleted
    expect(result.current.currentThreadId).toBeNull();

    // List should refetch to empty
    await waitFor(() => expect(result.current.threads.data).toHaveLength(0));
  });

  it("should load messages when currentThreadId is set", async () => {
    const mockMessages = [
      { id: "msg-1", role: "user", content: "Hello", threadId: "thread-1" },
      { id: "msg-2", role: "assistant", content: "Hi there!", threadId: "thread-1" },
    ];

    const fetchMock = vi.mocked(global.fetch);

    // Initial thread list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ threads: [] }),
    } as Response);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMastraMemory({ baseUrl: BASE_URL, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    // Messages query should not fire yet (no threadId)
    expect(result.current.messages.fetchStatus).toBe("idle");

    // Mock thread detail + messages fetches
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({
        thread: {
          id: "thread-1",
          resourceId: RESOURCE_ID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    } as Response);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({ messages: mockMessages }),
    } as Response);

    // Set the thread
    act(() => {
      result.current.setCurrentThreadId("thread-1");
    });

    await waitFor(() => expect(result.current.messages.isSuccess).toBe(true));

    expect(result.current.messages.data).toHaveLength(2);
    expect(result.current.messages.data?.[0]?.content).toBe("Hello");
  });
});
