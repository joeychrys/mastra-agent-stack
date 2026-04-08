import * as _assistant_ui_react from '@assistant-ui/react';
import { ThreadHistoryAdapter, AssistantRuntime } from '@assistant-ui/react';
import { useAISDKRuntime } from '@assistant-ui/react-ai-sdk';
import * as _tanstack_react_query from '@tanstack/react-query';
import * as react from 'react';
import { useChat } from '@ai-sdk/react';

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
/** Configuration for `useMastraWorkflow`. */
type MastraWorkflowConfig = {
    /** Base URL of the Mastra server. */
    baseUrl: string;
    /** Workflow ID to execute (must match a registered workflow on the server). */
    workflowId: string;
    /**
     * Path prefix for the workflowRoute endpoint.
     * The full URL is `${baseUrl}${workflowPath}/${workflowId}`.
     * @default "/workflow"
     */
    workflowPath?: string;
    /** Headers for authentication. */
    headers?: HeadersConfig;
    /**
     * Resource ID to associate the workflow run with (e.g. a user identifier).
     * Sent in the request body so the server can tag the run for tracking/filtering.
     *
     * Note: The actual authenticated user ID is extracted from the JWT by server
     * middleware and set on the request context — this field is for run-level
     * resource association.
     */
    resourceId?: string;
    /**
     * Transform the user's text message into the workflow's `inputData`.
     * Called inside `prepareSendMessagesRequest` with the latest message text.
     *
     * @example
     * ```ts
     * mapInput: (text) => ({ city: text })
     * ```
     */
    mapInput: (text: string) => Record<string, unknown>;
};
/** Status of an individual workflow step. */
type WorkflowStepStatus = "running" | "success" | "failed" | "suspended" | "waiting";
/** Result of an individual workflow step from the `data-workflow` stream part. */
type WorkflowStepResult = {
    name: string;
    status: WorkflowStepStatus;
    input: Record<string, unknown> | null;
    output: unknown | null;
    suspendPayload: Record<string, unknown> | null;
    resumePayload: Record<string, unknown> | null;
};
/** The `data` field inside a `data-workflow` message part. */
type WorkflowData = {
    name: string;
    status: string;
    steps: Record<string, WorkflowStepResult>;
    output: {
        usage: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
    } | null;
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

/** A workflow step that has suspended and is waiting for user input. */
type SuspendedStep = {
    /** The step ID (e.g. "resolve-city"). */
    stepId: string;
    /** The suspend payload sent by the step. */
    payload: Record<string, unknown>;
};
type MastraWorkflowReturn = {
    /** Raw messages from useChat. Render these manually. */
    messages: ReturnType<typeof useChat>["messages"];
    /** Chat status — "ready", "streaming", "error", etc. */
    status: ReturnType<typeof useChat>["status"];
    /**
     * Start the workflow with a text input.
     * The text is transformed via `mapInput` into `inputData`.
     */
    sendInput: (text: string) => void;
    /**
     * Resume a suspended workflow step.
     *
     * @param runId   — the workflow run ID (from `runId` in this return)
     * @param stepId  — the step that suspended (from `suspendedStep.stepId`)
     * @param data    — the resume payload matching the step's `resumeSchema`
     * @param label   — optional text shown as the user message
     */
    resume: (runId: string, stepId: string, data: unknown, label?: string) => void;
    /** The latest workflow data snapshot (derived from messages). */
    workflowData: WorkflowData | null;
    /** The current workflow run ID. */
    runId: string;
    /** The currently suspended step, if any. */
    suspendedStep: SuspendedStep | null;
};
/**
 * Connect to a Mastra workflow via `useChat` + `DefaultChatTransport`.
 *
 * Returns raw chat state with workflow-specific helpers for suspend/resume.
 * Render messages manually — this does NOT use assistant-ui.
 *
 * @example
 * ```tsx
 * const { messages, status, sendInput, resume, workflowData, suspendedStep, runId } =
 *   useMastraWorkflow({
 *     baseUrl: "http://localhost:4111",
 *     workflowId: "weather-workflow",
 *     mapInput: (text) => ({ city: text }),
 *   });
 * ```
 */
declare function useMastraWorkflow(config: MastraWorkflowConfig): MastraWorkflowReturn;

export { type HeadersConfig, type HistoryAdapterConfig, type MastraChatConfig, type MastraChatMemoryConfig, type MastraChatRuntimeOptions, type MastraMemoryConfig, type MastraMemoryMessage, type MastraThread, type MastraThreadListConfig, type MastraWorkflowConfig, type MastraWorkflowReturn, type SuspendedStep, type WorkflowData, type WorkflowStepResult, type WorkflowStepStatus, createHistoryAdapter, memoryKeys, useMastraChat, useMastraMemory, useMastraThreadListRuntime, useMastraWorkflow };
