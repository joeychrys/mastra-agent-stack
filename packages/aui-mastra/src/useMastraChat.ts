"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/ai-sdk";
import type { AssistantRuntime } from "@assistant-ui/react";
import { useMemo, useRef } from "react";
import { resolveHeaders } from "./internal/fetch";
import type { MastraChatConfig } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options forwarded to `useAISDKRuntime` (second parameter). */
export type MastraChatRuntimeOptions = Parameters<typeof useAISDKRuntime>[1];

// ---------------------------------------------------------------------------
// useMastraChat
// ---------------------------------------------------------------------------

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
export function useMastraChat(
  config: MastraChatConfig & { runtimeOptions?: MastraChatRuntimeOptions },
): AssistantRuntime {
  const { baseUrl, agentId, chatPath = "/chat", headers, memory, chatId, runtimeOptions } = config;

  const chatUrl = `${baseUrl}${chatPath}/${agentId}`;

  // Callers typically pass `headers` as an inline (async) function whose
  // identity changes every render. Read it through a ref so the transport
  // isn't recreated per render — the thunk resolves at request time, which
  // also guarantees the latest headers are used (not the first render's).
  const headersRef = useRef(headers);
  headersRef.current = headers;

  const threadId = memory?.threadId;
  const resourceId = memory?.resourceId;
  const hasMemory = memory !== undefined;

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: chatUrl,
        headers: () => resolveHeaders(headersRef.current),
        ...(hasMemory && {
          prepareSendMessagesRequest: async (options) => ({
            ...options,
            body: {
              ...options.body,
              messages: options.messages,
              trigger: options.trigger,
              memory: {
                thread: threadId,
                resource: resourceId,
              },
            },
          }),
        }),
      }),
    [chatUrl, hasMemory, threadId, resourceId],
  );

  const chat = useChat({
    ...(chatId && { id: chatId }),
    transport,
  });

  return useAISDKRuntime(chat, runtimeOptions);
}
