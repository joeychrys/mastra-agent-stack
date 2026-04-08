// ---------------------------------------------------------------------------
// @repo/aui-mastra — Type definitions
//
// This package wraps the AI SDK + assistant-ui for Mastra.  The AI SDK handles
// streaming, message state, and tool-call rendering.  These types configure
// the connection to a Mastra server and its native APIs (memory, etc.).
// ---------------------------------------------------------------------------

/** Headers that can be static, a sync function, or an async function. */
export type HeadersConfig =
  | Record<string, string>
  | (() => Record<string, string>)
  | (() => Promise<Record<string, string>>);

// ---------------------------------------------------------------------------
// Chat configuration
// ---------------------------------------------------------------------------

/** Configuration for `useMastraChat`. */
export type MastraChatConfig = {
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
export type MastraChatMemoryConfig = {
  /** Resource ID identifying the current user. */
  resourceId: string;
  /** Thread ID for the current conversation. */
  threadId?: string;
};

// ---------------------------------------------------------------------------
// Memory API types
// ---------------------------------------------------------------------------

/** Configuration for `useMastraMemory`. */
export type MastraMemoryConfig = {
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
export type MastraThread = {
  id: string;
  title?: string;
  metadata?: Record<string, unknown>;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
};

/** A message returned by the Mastra memory API. */
export type MastraMemoryMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: string;
  threadId: string;
};

// ---------------------------------------------------------------------------
// Workflow configuration
// ---------------------------------------------------------------------------

/** Configuration for `useMastraWorkflow`. */
export type MastraWorkflowConfig = {
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

// ---------------------------------------------------------------------------
// Workflow data part types (matches @mastra/ai-sdk WorkflowDataPart)
// ---------------------------------------------------------------------------

/** Status of an individual workflow step. */
export type WorkflowStepStatus = "running" | "success" | "failed" | "suspended" | "waiting";

/** Result of an individual workflow step from the `data-workflow` stream part. */
export type WorkflowStepResult = {
  name: string;
  status: WorkflowStepStatus;
  input: Record<string, unknown> | null;
  output: unknown | null;
  suspendPayload: Record<string, unknown> | null;
  resumePayload: Record<string, unknown> | null;
};

/** The `data` field inside a `data-workflow` message part. */
export type WorkflowData = {
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
