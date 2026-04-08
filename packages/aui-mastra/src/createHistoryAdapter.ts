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

import type { ThreadHistoryAdapter } from "@assistant-ui/react";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { fetchRawMessages } from "./internal/fetch";
import type { HeadersConfig } from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Configuration for `createHistoryAdapter`. */
export type HistoryAdapterConfig = {
  /** Thread ID to load history for (`null` returns an empty history). */
  threadId: string | null;
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
 * format to AI SDK v5 `UIMessage` format via `toAISdkV5Messages`.
 *
 * Pass the returned adapter to `useMastraChat` via
 * `runtimeOptions.adapters.history`.
 */
export function createHistoryAdapter(config: HistoryAdapterConfig): ThreadHistoryAdapter {
  const { threadId, baseUrl, agentId, headers } = config;

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

          if (!threadId) {
            return { messages: [] as HistoryMessage[] };
          }

          try {
            const raw = await fetchRawMessages(baseUrl, agentId, threadId, headers);
            if (!raw?.length) {
              return { messages: [] as HistoryMessage[] };
            }

            const uiMessages = toAISdkV5Messages(raw as Parameters<typeof toAISdkV5Messages>[0]);

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
