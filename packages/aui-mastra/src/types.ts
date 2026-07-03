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
