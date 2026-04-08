"use client";

import { useChat } from "@ai-sdk/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { normaliseHeaders } from "./internal/fetch";
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
  const resolvedHeaders = normaliseHeaders(headers);

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: chatUrl,
        headers: resolvedHeaders,
        ...(memory && {
          prepareSendMessagesRequest: async (options) => ({
            ...options,
            body: {
              ...options.body,
              messages: options.messages,
              memory: {
                thread: memory.threadId,
                resource: memory.resourceId,
              },
            },
          }),
        }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable
    [chatUrl, memory?.threadId, memory?.resourceId],
  );

  const chat = useChat({
    ...(chatId && { id: chatId }),
    transport,
  });

  return useAISDKRuntime(chat, runtimeOptions);
}
