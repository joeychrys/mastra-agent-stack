/**
 * Thread history adapter for Mastra Memory.
 *
 * Loads previous messages when switching threads so the UI shows the full
 * conversation history.  Fetches raw Mastra messages and converts them to
 * the AI SDK v7 `UIMessage` format that assistant-ui (`@assistant-ui/ai-sdk`)
 * expects.
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

import type { ThreadHistoryAdapter } from "@assistant-ui/react";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import { fetchRawMessages } from "./internal/fetch";
import type { HeadersConfig } from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Configuration for `createHistoryAdapter`. */
export type HistoryAdapterConfig = {
  /**
   * Server-side thread ID to load history for (`null`/`undefined` returns an
   * empty history). Pass a function to resolve it lazily at load time — e.g.
   * from the thread list item's `remoteId`, which only exists once the thread
   * has been created on the server.
   */
  threadId: string | null | (() => string | null | undefined);
  /** Base URL of the Mastra server. */
  baseUrl: string;
  /** Agent ID — required by the Mastra memory API. */
  agentId: string;
  /** Headers for authentication. */
  headers?: HeadersConfig;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a `ThreadHistoryAdapter` that loads messages for a given thread
 * from the Mastra memory API, converting them from Mastra's internal DB
 * format to AI SDK v7 `UIMessage` format via `toAISdkMessages(..., { version: "v7" })`.
 *
 * Pass the returned adapter to `useMastraChat` via
 * `runtimeOptions.adapters.history`.
 */
export function createHistoryAdapter(config: HistoryAdapterConfig): ThreadHistoryAdapter {
  const { baseUrl, agentId, headers } = config;
  const resolveThreadId = () =>
    typeof config.threadId === "function" ? config.threadId() : config.threadId;

  return {
    async load() {
      return { messages: [] } as never;
    },

    async append() {
      // No-op — Mastra Memory persists messages server-side
    },

    withFormat<TMessage>() {
      return {
        async load() {
          type HistoryMessage = { parentId: string | null; message: TMessage };

          const threadId = resolveThreadId();
          if (!threadId) {
            return { messages: [] as HistoryMessage[] };
          }

          try {
            const raw = await fetchRawMessages(baseUrl, agentId, threadId, headers);
            if (!raw?.length) {
              return { messages: [] as HistoryMessage[] };
            }

            const uiMessages = toAISdkMessages(raw as Parameters<typeof toAISdkMessages>[0], {
              version: "v7",
            });

            let parentId: string | null = null;
            return {
              messages: uiMessages.map((msg) => {
                const item: HistoryMessage = { parentId, message: msg as TMessage };
                parentId = msg.id;
                return item;
              }),
            };
          } catch {
            return { messages: [] as HistoryMessage[] };
          }
        },

        async append() {
          // No-op — Mastra Memory persists messages server-side
        },
      };
    },
  };
}
