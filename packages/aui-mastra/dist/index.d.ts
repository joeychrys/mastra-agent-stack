import * as _assistant_ui_react from '@assistant-ui/react';
import { ThreadHistoryAdapter, AssistantRuntime } from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import * as _tanstack_react_query from '@tanstack/react-query';
import * as react from 'react';

/** Headers that can be static, a sync function, or an async function. */
type HeadersConfig = Record<string, string> | (() => Record<string, string>) | (() => Promise<Record<string, string>>);
/** Configuration for `useMastraChat`. */
type MastraChatConfig = {
    /** Base URL of the Mastra server (e.g. "http://localhost:4111"). */
    baseUrl: string;
    /** Agent ID to chat with (must match a registered agent on the server). */
    agentId: string;
    /**
     * Path prefix for the chatRoute endpoint.
     * The full URL is `${baseUrl}${chatPath}/${agentId}`.
     * @default "/chat"
     */
    chatPath?: string;
    /** Headers for authentication (e.g. JWT Bearer token). */
    headers?: HeadersConfig;
    /**
     * Memory configuration.  When provided, thread/resource IDs are sent in
     * every chat request so messages are persisted by Mastra's memory system.
     */
    memory?: MastraChatMemoryConfig;
    /**
     * Chat instance ID — passed to `useChat({ id })`.
     * Useful when using multiple chat instances or thread-based routing.
     */
    chatId?: string;
};
/** Memory config attached to each chat request. */
type MastraChatMemoryConfig = {
    /** Resource ID identifying the current user. */
    resourceId: string;
    /** Thread ID for the current conversation. */
    threadId?: string;
};
/** Configuration for `useMastraMemory`. */
type MastraMemoryConfig = {
    /** Base URL of the Mastra server. */
    baseUrl: string;
    /** Agent ID — required by the Mastra memory API on every endpoint. */
    agentId: string;
    /** Resource ID identifying the current user. */
    resourceId: string;
    /** Headers for authentication. */
    headers?: HeadersConfig;
};
/** A thread returned by the Mastra memory API. */
type MastraThread = {
    id: string;
    title?: string;
    metadata?: Record<string, unknown>;
    resourceId: string;
    createdAt: string;
    updatedAt: string;
};
/** A message returned by the Mastra memory API. */
type MastraMemoryMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    createdAt?: string;
    threadId: string;
};

/**
 * Thread history adapter for Mastra Memory.
 *
 * Loads previous messages when switching threads so the UI shows the full
 * conversation history.  Fetches raw Mastra messages and converts them to
 * the AI SDK v5 message format that assistant-ui expects.
 *
 * @example
 * ```tsx
 * import { createHistoryAdapter, useMastraChat } from "@repo/aui-mastra";
 *
 * const adapter = createHistoryAdapter({
 *   threadId,
 *   baseUrl: "http://localhost:4111",
 *   agentId: "weatherAgent",
 *   headers: authHeaders,
 * });
 *
 * const runtime = useMastraChat({
 *   baseUrl: "http://localhost:4111",
 *   agentId: "weatherAgent",
 *   runtimeOptions: { adapters: { history: adapter } },
 * });
 * ```
 */

/** Configuration for `createHistoryAdapter`. */
type HistoryAdapterConfig = {
    /** Thread ID to load history for (`null` returns an empty history). */
    threadId: string | null;
    /** Base URL of the Mastra server. */
    baseUrl: string;
    /** Agent ID — required by the Mastra memory API. */
    agentId: string;
    /** Headers for authentication. */
    headers?: HeadersConfig;
};
/**
 * Creates a `ThreadHistoryAdapter` that loads messages for a given thread
 * from the Mastra memory API, converting them from Mastra's internal DB
 * format to AI SDK v5 `UIMessage` format via `toAISdkV5Messages`.
 *
 * Pass the returned adapter to `useMastraChat` via
 * `runtimeOptions.adapters.history`.
 */
declare function createHistoryAdapter(config: HistoryAdapterConfig): ThreadHistoryAdapter;

/** Options forwarded to `useAISDKRuntime` (second parameter). */
type MastraChatRuntimeOptions = Parameters<typeof useAISDKRuntime>[1];
/**
 * Connect to a Mastra agent via the AI SDK (single-thread mode).
 *
 * Wraps `useChat` + `useAISDKRuntime` and points the transport at the Mastra
 * server's `chatRoute` endpoint.  Returns an `AssistantRuntime` that can be
 * passed to `<AssistantRuntimeProvider>`.
 *
 * For multi-thread support with a sidebar, use `useMastraThreadListRuntime`
 * instead — it handles thread creation, switching, and history automatically.
 *
 * @example
 * ```tsx
 * import { useMastraChat } from "@repo/aui-mastra";
 * import { AssistantRuntimeProvider } from "@assistant-ui/react";
 *
 * const runtime = useMastraChat({
 *   baseUrl: "http://localhost:4111",
 *   agentId: "weatherAgent",
 * });
 *
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
declare function useMastraChat(config: MastraChatConfig & {
    runtimeOptions?: MastraChatRuntimeOptions;
}): AssistantRuntime;

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
declare const memoryKeys: {
    all: (baseUrl: string, agentId: string, resourceId: string) => readonly ["mastra-memory", string, string, string];
    threads: (baseUrl: string, agentId: string, resourceId: string) => readonly ["mastra-memory", string, string, string, "threads"];
    thread: (baseUrl: string, agentId: string, resourceId: string, threadId: string) => readonly ["mastra-memory", string, string, string, "thread", string];
    messages: (baseUrl: string, agentId: string, resourceId: string, threadId: string) => readonly ["mastra-memory", string, string, string, "messages", string];
};
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
declare function useMastraMemory(config: MastraMemoryConfig): {
    currentThreadId: string | null;
    setCurrentThreadId: react.Dispatch<react.SetStateAction<string | null>>;
    threads: _tanstack_react_query.UseQueryResult<MastraThread[], Error>;
    thread: _tanstack_react_query.UseQueryResult<MastraThread, Error>;
    messages: _tanstack_react_query.UseQueryResult<MastraMemoryMessage[], Error>;
    createThread: _tanstack_react_query.UseMutationResult<MastraThread, Error, {
        metadata?: Record<string, unknown>;
    } | undefined, unknown>;
    updateThread: _tanstack_react_query.UseMutationResult<MastraThread, Error, {
        threadId: string;
        update: {
            title?: string;
            metadata?: Record<string, unknown>;
        };
    }, unknown>;
    deleteThread: _tanstack_react_query.UseMutationResult<string, Error, string, unknown>;
    getThread: (threadId: string) => Promise<MastraThread>;
    getMessages: (threadId: string) => Promise<MastraMemoryMessage[]>;
};

/** Configuration for `useMastraThreadListRuntime`. */
type MastraThreadListConfig = {
    /** Base URL of the Mastra server (e.g. "http://localhost:4111"). */
    baseUrl: string;
    /** Agent ID — required by the Mastra memory API on every endpoint. */
    agentId: string;
    /** Resource ID identifying the current user. */
    resourceId: string;
    /** Headers for authentication (e.g. JWT Bearer token). */
    headers?: HeadersConfig;
    /**
     * Path prefix for the chatRoute endpoint.
     * The full URL is `${baseUrl}${chatPath}/${agentId}`.
     * @default "/chat"
     */
    chatPath?: string;
    /**
     * Optional summarizer agent for AI-generated thread titles.
     *
     * When enabled, the first user message is sent to
     * `POST /api/agents/{agentId}/generate` and the response text is used
     * as the thread title.
     *
     * When omitted or `enabled: false`, titles are generated by truncating
     * the first user message to 60 characters.
     *
     * @example
     * ```ts
     * titleAgent: {
     *   enabled: true,
     *   agentId: "summarizerAgent",
     * }
     * ```
     */
    titleAgent?: {
        /** Whether to use the summarizer agent. @default false */
        enabled: boolean;
        /** REST route key of the summarizer agent (e.g. `"summarizerAgent"`). */
        agentId: string;
    };
};
/**
 * Full thread-list runtime for a Mastra agent with memory.
 *
 * Combines `unstable_useRemoteThreadListRuntime` with a Mastra-backed
 * adapter and per-thread chat runtime.  The returned `AssistantRuntime`
 * drives both the thread list sidebar (`ThreadListPrimitive`) and the
 * active conversation (`Thread`).
 */
declare function useMastraThreadListRuntime(config: MastraThreadListConfig): _assistant_ui_react.AssistantRuntime;

export { type HeadersConfig, type HistoryAdapterConfig, type MastraChatConfig, type MastraChatMemoryConfig, type MastraChatRuntimeOptions, type MastraMemoryConfig, type MastraMemoryMessage, type MastraThread, type MastraThreadListConfig, createHistoryAdapter, memoryKeys, useMastraChat, useMastraMemory, useMastraThreadListRuntime };
