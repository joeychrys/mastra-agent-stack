import {
  ActionBarPrimitive,
  type AssistantRuntime,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { type FC, createElement as h, type ReactNode, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHistoryAdapter } from "../../src/createHistoryAdapter";
import { useMastraMemory } from "../../src/useMastraMemory";
import { useMastraThreadListRuntime } from "../../src/useMastraThreadListRuntime";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:4111";
// Always the agent's `id` (as listed by GET /api/agents), never the map key.
const AGENT_ID = "weather-agent";
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
      () => useMastraMemory({ baseUrl: BASE_URL, agentId: AGENT_ID, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    // Initially loading
    expect(result.current.threads.isLoading).toBe(true);

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    expect(result.current.threads.data).toHaveLength(2);
    expect(result.current.threads.data?.[0]?.id).toBe("thread-1");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/memory/threads?agentId=${AGENT_ID}&resourceId=${RESOURCE_ID}`),
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
      () => useMastraMemory({ baseUrl: BASE_URL, agentId: AGENT_ID, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    // Set up mocks for create + refetch. POST /api/memory/threads returns the
    // created thread object directly (not wrapped) — verified against the API.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => newThread,
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

      // Single thread detail — returned directly (not wrapped)
      if (url.includes("/threads/thread-1")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-length": "100" }),
          json: async () => threadOne,
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useMastraMemory({ baseUrl: BASE_URL, agentId: AGENT_ID, resourceId: RESOURCE_ID }),
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
      () => useMastraMemory({ baseUrl: BASE_URL, agentId: AGENT_ID, resourceId: RESOURCE_ID }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.threads.isSuccess).toBe(true));

    // Messages query should not fire yet (no threadId)
    expect(result.current.messages.fetchStatus).toBe("idle");

    // Mock thread detail + messages fetches (detail is returned directly)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "100" }),
      json: async () => ({
        id: "thread-1",
        resourceId: RESOURCE_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

// ---------------------------------------------------------------------------
// assistant-ui runtime integration
//
// These mount the REAL AssistantRuntimeProvider, remote thread-list runtime,
// `@assistant-ui/ai-sdk` adapter and AI SDK client. Only the network is mocked
// (at the `fetch` boundary), using genuine AI SDK v7 UI message streams.
// ---------------------------------------------------------------------------

const LOCAL_ID_PREFIX = "__LOCALID_";
// Errors from the assistant-ui snapshot update loop (assistant-ui issue #6133).
const UPDATE_LOOP_ERROR = /getSnapshot should be cached|Maximum update depth exceeded/;
const TIMESTAMP = "2026-10-01T00:00:00.000Z";

type RecordedRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: Record<string, unknown> | undefined;
  rawBody: string | undefined;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const pathOf = (url: string) => new URL(url).pathname;
const isChatRequest = (r: RecordedRequest) =>
  r.method === "POST" && pathOf(r.url) === `/chat/${AGENT_ID}`;
const isCreateThreadRequest = (r: RecordedRequest) =>
  r.method === "POST" && pathOf(r.url) === "/api/memory/threads";

/** A stored Mastra message as returned by `GET /api/memory/threads/:id/messages`. */
const storedMessage = (
  threadId: string,
  id: string,
  role: "user" | "assistant",
  parts: unknown[],
  second: number,
) => ({
  id,
  role,
  threadId,
  resourceId: RESOURCE_ID,
  type: "v2",
  createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, second)).toISOString(),
  content: { format: 2, parts },
});

const threadHistory = (threadId: string) => [
  storedMessage(
    threadId,
    `${threadId}-u1`,
    "user",
    [{ type: "text", text: `Hello from ${threadId}` }],
    0,
  ),
  storedMessage(
    threadId,
    `${threadId}-a1`,
    "assistant",
    [{ type: "text", text: `Reply in ${threadId}` }],
    1,
  ),
];

/** A genuine AI SDK v7 UI message stream: a completed tool call plus a text answer. */
const chatStreamResponse = (answer: string) =>
  createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({
          type: "tool-input-available",
          toolCallId: "call-1",
          toolName: "weatherTool",
          input: { location: "Paris" },
        });
        writer.write({
          type: "tool-output-available",
          toolCallId: "call-1",
          output: { temperature: 20 },
        });
        writer.write({ type: "text-start", id: "txt-1" });
        writer.write({ type: "text-delta", id: "txt-1", delta: answer });
        writer.write({ type: "text-end", id: "txt-1" });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    }),
  });

/** Routes requests to a fake Mastra server and records every request. */
function installMastraServer(options: {
  threads?: { id: string; title?: string }[];
  history?: Record<string, unknown[]>;
  createThread?: () => Promise<Response>;
}) {
  const requests: RecordedRequest[] = [];
  const thread = (id: string, title?: string) => ({
    id,
    title,
    resourceId: RESOURCE_ID,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  vi.mocked(global.fetch).mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const rawBody = typeof init?.body === "string" ? init.body : undefined;
      const req: RecordedRequest = {
        url,
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
        body: rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined,
        rawBody,
      };
      requests.push(req);

      const path = pathOf(url);
      if (path === "/api/memory/threads" && req.method === "GET") {
        return json({ threads: (options.threads ?? []).map((t) => thread(t.id, t.title)) });
      }
      if (isCreateThreadRequest(req)) {
        return options.createThread ? options.createThread() : json(thread("server-thread-1"));
      }
      const match = path.match(/^\/api\/memory\/threads\/([^/]+)(\/messages)?$/);
      if (match) {
        const [, id = "", messages] = match;
        if (messages) return json({ messages: options.history?.[id] ?? [] });
        if (req.method === "GET") return json(thread(id));
        return json({}); // PATCH (rename) / DELETE
      }
      if (isChatRequest(req)) return chatStreamResponse("It is sunny in Paris.");

      throw new Error(`Unexpected fetch: ${req.method} ${url}`);
    },
  );

  return requests;
}

const UserMessage: FC = () =>
  h(
    MessagePrimitive.Root,
    null,
    h(MessagePrimitive.Parts, null),
    h(ActionBarPrimitive.Root, null, h(ActionBarPrimitive.Edit, { "aria-label": "Edit message" })),
  );

const EditComposer: FC = () =>
  h(
    MessagePrimitive.Root,
    null,
    h(
      ComposerPrimitive.Root,
      null,
      h(ComposerPrimitive.Input, { "aria-label": "Edit message input" }),
      h(ComposerPrimitive.Cancel, null, "Cancel"),
      h(ComposerPrimitive.Send, null, "Update"),
    ),
  );

const AssistantMessage: FC = () => h(MessagePrimitive.Root, null, h(MessagePrimitive.Parts, null));

function renderChat({ strict = false }: { strict?: boolean } = {}) {
  const captured: { runtime?: AssistantRuntime } = {};

  const App: FC = () => {
    const runtime = useMastraThreadListRuntime({
      baseUrl: BASE_URL,
      agentId: AGENT_ID,
      resourceId: RESOURCE_ID,
      // Inline async thunk with a new identity every render, as the app passes it.
      headers: async () => ({ Authorization: "Bearer test-token" }),
    });
    captured.runtime = runtime;
    return h(
      AssistantRuntimeProvider,
      { runtime },
      h(
        ThreadPrimitive.Root,
        null,
        h(ThreadPrimitive.Messages, {
          components: { UserMessage, EditComposer, AssistantMessage },
        }),
      ),
    );
  };

  const utils = render(strict ? h(StrictMode, null, h(App)) : h(App));
  const runtime = () => {
    if (!captured.runtime) throw new Error("runtime not mounted");
    return captured.runtime;
  };
  return { ...utils, runtime };
}

const messageTexts = (runtime: AssistantRuntime) =>
  runtime.thread
    .getState()
    .messages.flatMap((m) => m.content.flatMap((p) => (p.type === "text" ? [p.text] : [])));

/** Let pending effects, commits and stream chunks flush. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

describe("useMastraThreadListRuntime — assistant-ui runtime integration", () => {
  let originalFetch: typeof global.fetch;
  let consoleErrors: string[];

  const expectNoUpdateLoop = () =>
    expect(consoleErrors.filter((e) => UPDATE_LOOP_ERROR.test(e))).toEqual([]);

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    consoleErrors = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      consoleErrors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "));
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    { strict: false },
    { strict: true },
  ])("mounts and settles without a snapshot update loop (strict: $strict)", async ({ strict }) => {
    const requests = installMastraServer({
      threads: [
        { id: "t-1", title: "First" },
        { id: "t-2", title: "Second" },
      ],
    });
    const { runtime } = renderChat({ strict });

    await waitFor(() =>
      expect([...runtime().threads.getState().threadIds].sort()).toEqual(["t-1", "t-2"]),
    );
    await settle();

    expectNoUpdateLoop();
    expect(requests.some((r) => r.url.includes(LOCAL_ID_PREFIX))).toBe(false);
  });

  it("switches threads and loads each thread's history without leaking messages", async () => {
    installMastraServer({
      threads: [{ id: "t-1" }, { id: "t-2" }],
      history: { "t-1": threadHistory("t-1"), "t-2": threadHistory("t-2") },
    });
    const { runtime, container } = renderChat();
    await waitFor(() => expect(runtime().threads.getState().threadIds).toHaveLength(2));

    await act(() => runtime().threads.switchToThread("t-1"));
    await waitFor(() =>
      expect(messageTexts(runtime())).toEqual(["Hello from t-1", "Reply in t-1"]),
    );

    await act(() => runtime().threads.switchToThread("t-2"));
    await waitFor(() =>
      expect(messageTexts(runtime())).toEqual(["Hello from t-2", "Reply in t-2"]),
    );
    await waitFor(() => expect(container.textContent).toContain("Reply in t-2"));
    expect(container.textContent).not.toContain("t-1");

    await settle();
    expectNoUpdateLoop();
    expect(consoleErrors.filter((e) => e.includes("Failed to load message history"))).toEqual([]);
  });

  it("opens the edit composer for an existing user message without looping", async () => {
    installMastraServer({ threads: [{ id: "t-1" }], history: { "t-1": threadHistory("t-1") } });
    const { runtime, findByRole } = renderChat();
    await waitFor(() => expect(runtime().threads.getState().threadIds).toHaveLength(1));
    await act(() => runtime().threads.switchToThread("t-1"));

    fireEvent.click(await findByRole("button", { name: "Edit message" }));
    const input = (await findByRole("textbox", {
      name: "Edit message input",
    })) as HTMLTextAreaElement;
    expect(input.value).toBe("Hello from t-1");

    await settle();
    expectNoUpdateLoop();
  });

  it("creates exactly one server thread on first send and never sends the local ID", async () => {
    let releaseCreate!: () => void;
    const creationGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    const requests = installMastraServer({
      threads: [],
      // Delay thread creation so the chat request would race ahead of it.
      createThread: async () => {
        await creationGate;
        return json({
          id: "server-thread-1",
          resourceId: RESOURCE_ID,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        });
      },
    });
    const { runtime } = renderChat();
    await waitFor(() =>
      expect(
        requests.some((r) => r.method === "GET" && pathOf(r.url) === "/api/memory/threads"),
      ).toBe(true),
    );
    await settle();

    await act(async () => {
      runtime().thread.composer.setText("Weather in Paris?");
      runtime().thread.composer.send();
    });
    await settle();

    // Creation is still pending: the chat request must wait for the server ID.
    expect(requests.filter(isCreateThreadRequest)).toHaveLength(1);
    expect(requests.filter(isChatRequest)).toHaveLength(0);

    await act(async () => {
      releaseCreate();
    });
    await waitFor(() => expect(requests.filter(isChatRequest)).toHaveLength(1));

    const chat = requests.find(isChatRequest);
    expect(chat?.body).toMatchObject({
      trigger: "submit-message",
      memory: { thread: "server-thread-1", resource: RESOURCE_ID },
    });
    expect(chat?.body).not.toHaveProperty("id");
    expect(chat?.headers.get("Authorization")).toBe("Bearer test-token");

    // The v7 stream is consumed: text and tool result reach the runtime.
    await waitFor(() => expect(messageTexts(runtime())).toContain("It is sunny in Paris."));
    const toolCall = runtime()
      .thread.getState()
      .messages.flatMap((m) => m.content)
      .find((p) => p.type === "tool-call");
    expect(toolCall).toMatchObject({
      toolName: "weatherTool",
      args: { location: "Paris" },
      result: { temperature: 20 },
    });

    await settle();
    expect(requests.filter(isCreateThreadRequest)).toHaveLength(1);
    expect(
      requests.some((r) => r.url.includes(LOCAL_ID_PREFIX) || r.rawBody?.includes(LOCAL_ID_PREFIX)),
    ).toBe(false);
    expectNoUpdateLoop();
  });

  it("sends the regenerate trigger when reloading an assistant response", async () => {
    const requests = installMastraServer({
      threads: [{ id: "t-1" }],
      history: { "t-1": threadHistory("t-1") },
    });
    const { runtime } = renderChat();
    await waitFor(() => expect(runtime().threads.getState().threadIds).toHaveLength(1));
    await act(() => runtime().threads.switchToThread("t-1"));
    await waitFor(() => expect(messageTexts(runtime())).toContain("Reply in t-1"));

    const assistant = runtime()
      .thread.getState()
      .messages.find((m) => m.role === "assistant");
    if (!assistant) throw new Error("assistant message not loaded");
    await act(async () => {
      runtime().thread.getMessageById(assistant.id).reload();
    });

    await waitFor(() => expect(requests.filter(isChatRequest)).toHaveLength(1));
    expect(requests.find(isChatRequest)?.body).toMatchObject({
      trigger: "regenerate-message",
      memory: { thread: "t-1", resource: RESOURCE_ID },
    });
    await waitFor(() => expect(messageTexts(runtime())).toContain("It is sunny in Paris."));
    expect(messageTexts(runtime())).not.toContain("Reply in t-1");

    await settle();
    expectNoUpdateLoop();
  });
});

describe("createHistoryAdapter — AI SDK v7 conversion", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("converts stored Mastra messages into linked v7 UI messages", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      json({
        messages: [
          storedMessage("t-1", "m1", "user", [{ type: "text", text: "Weather in Paris?" }], 0),
          storedMessage(
            "t-1",
            "m2",
            "assistant",
            [
              {
                type: "tool-invocation",
                toolInvocation: {
                  state: "result",
                  toolCallId: "call-1",
                  toolName: "weatherTool",
                  args: { location: "Paris" },
                  result: { temperature: 20 },
                },
              },
              { type: "text", text: "It is 20C in Paris." },
            ],
            1,
          ),
        ],
      }),
    );

    const adapter = createHistoryAdapter({ threadId: "t-1", baseUrl: BASE_URL, agentId: AGENT_ID });
    const withFormat = adapter.withFormat;
    if (!withFormat) throw new Error("withFormat is required by @assistant-ui/ai-sdk");
    const { messages } = await withFormat<{ id: string }, unknown>({} as never).load();

    expect(messages.map((m) => [m.parentId, m.message.id])).toEqual([
      [null, "m1"],
      ["m1", "m2"],
    ]);
    expect(messages[1]?.message).toMatchObject({
      role: "assistant",
      parts: [
        {
          type: "tool-weatherTool",
          toolCallId: "call-1",
          state: "output-available",
          input: { location: "Paris" },
          output: { temperature: 20 },
        },
        { type: "text", text: "It is 20C in Paris." },
      ],
    });
  });

  it("returns an empty history without fetching when there is no server thread", async () => {
    const adapter = createHistoryAdapter({ threadId: null, baseUrl: BASE_URL, agentId: AGENT_ID });
    const withFormat = adapter.withFormat;
    if (!withFormat) throw new Error("withFormat is required by @assistant-ui/ai-sdk");

    await expect(withFormat({} as never).load()).resolves.toEqual({ messages: [] });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
