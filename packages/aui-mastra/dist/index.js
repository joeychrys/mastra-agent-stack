"use client";

// src/createHistoryAdapter.ts
import { toAISdkMessages } from "@mastra/ai-sdk/ui";

// src/internal/fetch.ts
var resolveHeaders = async (headers) => {
  if (!headers) return {};
  if (typeof headers === "function") return await headers();
  return headers;
};
async function mastraFetch(url, headers, init) {
  const resolved = await resolveHeaders(headers);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...resolved,
      ...init?.headers
    }
  });
  if (!res.ok) {
    throw new Error(`Mastra API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return void 0;
  }
  return res.json();
}
async function fetchRawMessages(baseUrl, agentId, threadId, headers) {
  const resolved = await resolveHeaders(headers);
  const res = await fetch(
    `${baseUrl}/api/memory/threads/${threadId}/messages?agentId=${encodeURIComponent(agentId)}`,
    { headers: { ...resolved } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.uiMessages ?? data?.messages ?? [];
}

// src/createHistoryAdapter.ts
function createHistoryAdapter(config) {
  const { baseUrl, agentId, headers } = config;
  const resolveThreadId = () => typeof config.threadId === "function" ? config.threadId() : config.threadId;
  return {
    async load() {
      return { messages: [] };
    },
    async append() {
    },
    withFormat() {
      return {
        async load() {
          const threadId = resolveThreadId();
          if (!threadId) {
            return { messages: [] };
          }
          try {
            const raw = await fetchRawMessages(baseUrl, agentId, threadId, headers);
            if (!raw?.length) {
              return { messages: [] };
            }
            const uiMessages = toAISdkMessages(raw, {
              version: "v7"
            });
            let parentId = null;
            return {
              messages: uiMessages.map((msg) => {
                const item = { parentId, message: msg };
                parentId = msg.id;
                return item;
              })
            };
          } catch {
            return { messages: [] };
          }
        },
        async append() {
        }
      };
    }
  };
}

// src/useMastraChat.ts
import { useChat } from "@ai-sdk/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/ai-sdk";
import { useMemo, useRef } from "react";
function useMastraChat(config) {
  const { baseUrl, agentId, chatPath = "/chat", headers, memory, chatId, runtimeOptions } = config;
  const chatUrl = `${baseUrl}${chatPath}/${agentId}`;
  const headersRef = useRef(headers);
  headersRef.current = headers;
  const threadId = memory?.threadId;
  const resourceId = memory?.resourceId;
  const hasMemory = memory !== void 0;
  const transport = useMemo(
    () => new AssistantChatTransport({
      api: chatUrl,
      headers: () => resolveHeaders(headersRef.current),
      ...hasMemory && {
        prepareSendMessagesRequest: async (options) => ({
          ...options,
          body: {
            ...options.body,
            messages: options.messages,
            trigger: options.trigger,
            memory: {
              thread: threadId,
              resource: resourceId
            }
          }
        })
      }
    }),
    [chatUrl, hasMemory, threadId, resourceId]
  );
  const chat = useChat({
    ...chatId && { id: chatId },
    transport
  });
  return useAISDKRuntime(chat, runtimeOptions);
}

// src/useMastraMemory.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
var memoryKeys = {
  all: (baseUrl, agentId, resourceId) => ["mastra-memory", baseUrl, agentId, resourceId],
  threads: (baseUrl, agentId, resourceId) => [...memoryKeys.all(baseUrl, agentId, resourceId), "threads"],
  thread: (baseUrl, agentId, resourceId, threadId) => [...memoryKeys.all(baseUrl, agentId, resourceId), "thread", threadId],
  messages: (baseUrl, agentId, resourceId, threadId) => [...memoryKeys.all(baseUrl, agentId, resourceId), "messages", threadId]
};
function useMastraMemory(config) {
  const { baseUrl, agentId, resourceId, headers } = config;
  const apiBase = `${baseUrl}/api/memory`;
  const queryClient = useQueryClient();
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const threads = useQuery({
    queryKey: memoryKeys.threads(baseUrl, agentId, resourceId),
    queryFn: async () => {
      const result = await mastraFetch(
        `${apiBase}/threads?agentId=${encodeURIComponent(agentId)}&resourceId=${encodeURIComponent(resourceId)}`,
        headers
      );
      return result.threads;
    }
  });
  const thread = useQuery({
    queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, currentThreadId ?? ""),
    queryFn: async () => {
      return mastraFetch(
        `${apiBase}/threads/${currentThreadId}?agentId=${encodeURIComponent(agentId)}`,
        headers
      );
    },
    enabled: !!currentThreadId
  });
  const messages = useQuery({
    queryKey: memoryKeys.messages(baseUrl, agentId, resourceId, currentThreadId ?? ""),
    queryFn: async () => {
      const result = await mastraFetch(
        `${apiBase}/threads/${currentThreadId}/messages?agentId=${encodeURIComponent(agentId)}`,
        headers
      );
      return result.messages;
    },
    enabled: !!currentThreadId,
    staleTime: 5e3
  });
  const createThread = useMutation({
    mutationFn: async (variables) => {
      return mastraFetch(
        `${apiBase}/threads?agentId=${encodeURIComponent(agentId)}`,
        headers,
        {
          method: "POST",
          body: JSON.stringify({ resourceId, metadata: variables?.metadata })
        }
      );
    },
    onSuccess: (thread2) => {
      setCurrentThreadId(thread2.id);
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId)
      });
    }
  });
  const updateThread = useMutation({
    mutationFn: async (variables) => {
      return mastraFetch(
        `${apiBase}/threads/${variables.threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
        {
          method: "PATCH",
          body: JSON.stringify(variables.update)
        }
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId)
      });
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, variables.threadId)
      });
    }
  });
  const deleteThread = useMutation({
    mutationFn: async (threadId) => {
      await mastraFetch(
        `${apiBase}/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers,
        { method: "DELETE" }
      );
      return threadId;
    },
    onSuccess: (threadId) => {
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
      }
      void queryClient.invalidateQueries({
        queryKey: memoryKeys.threads(baseUrl, agentId, resourceId)
      });
      queryClient.removeQueries({
        queryKey: memoryKeys.thread(baseUrl, agentId, resourceId, threadId)
      });
      queryClient.removeQueries({
        queryKey: memoryKeys.messages(baseUrl, agentId, resourceId, threadId)
      });
    }
  });
  const getThread = useCallback(
    async (threadId) => {
      return mastraFetch(
        `${apiBase}/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
        headers
      );
    },
    [apiBase, agentId, headers]
  );
  const getMessages = useCallback(
    async (threadId) => {
      const result = await mastraFetch(
        `${apiBase}/threads/${threadId}/messages?agentId=${encodeURIComponent(agentId)}`,
        headers
      );
      return result.messages;
    },
    [apiBase, agentId, headers]
  );
  return {
    // Reactive state
    currentThreadId,
    setCurrentThreadId,
    // Queries (UseQueryResult — .data, .isLoading, .isError, .error, etc.)
    threads,
    thread,
    messages,
    // Mutations (UseMutationResult — .mutate(), .mutateAsync(), .isPending, etc.)
    createThread,
    updateThread,
    deleteThread,
    // Imperative helpers
    getThread,
    getMessages
  };
}

// src/useMastraThreadListRuntime.ts
import { AssistantChatTransport as AssistantChatTransport2, useChatRuntime } from "@assistant-ui/ai-sdk";
import { useAui, useAuiState, useRemoteThreadListRuntime } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo as useMemo2, useRef as useRef2 } from "react";
var LOCAL_THREAD_ID_PREFIX = "__LOCALID_";
async function resolveThreadIdAsync(threadId, map, pending, initializeItem) {
  const known = map.get(threadId);
  if (known) return known;
  const inflight = pending.get(threadId);
  if (inflight) return inflight;
  if (!threadId.startsWith(LOCAL_THREAD_ID_PREFIX)) return threadId;
  const initialized = await initializeItem?.();
  const remoteId = initialized?.remoteId ?? map.get(threadId);
  if (!remoteId || remoteId.startsWith(LOCAL_THREAD_ID_PREFIX)) {
    throw new Error(`Thread ${threadId} has no server-side ID; refusing to send a local thread ID`);
  }
  return remoteId;
}
async function apiListThreads(baseUrl, agentId, resourceId, headers) {
  const result = await mastraFetch(
    `${baseUrl}/api/memory/threads?agentId=${encodeURIComponent(agentId)}&resourceId=${encodeURIComponent(resourceId)}`,
    headers
  );
  return result.threads;
}
async function apiCreateThread(baseUrl, agentId, resourceId, headers) {
  return mastraFetch(
    `${baseUrl}/api/memory/threads?agentId=${encodeURIComponent(agentId)}`,
    headers,
    { method: "POST", body: JSON.stringify({ resourceId }) }
  );
}
async function apiFetchThread(baseUrl, agentId, threadId, headers) {
  return mastraFetch(
    `${baseUrl}/api/memory/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
    headers
  );
}
async function apiRenameThread(baseUrl, agentId, threadId, title, headers) {
  await mastraFetch(
    `${baseUrl}/api/memory/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
    headers,
    { method: "PATCH", body: JSON.stringify({ title }) }
  );
}
async function apiDeleteThread(baseUrl, agentId, threadId, headers) {
  await mastraFetch(
    `${baseUrl}/api/memory/threads/${threadId}?agentId=${encodeURIComponent(agentId)}`,
    headers,
    { method: "DELETE" }
  );
}
function createThreadListAdapter(configRef, threadIdMap, pendingInits) {
  const cfg = () => configRef.current;
  return {
    async list() {
      const { baseUrl, agentId, resourceId, headers } = cfg();
      const threads = await apiListThreads(baseUrl, agentId, resourceId, headers);
      return {
        threads: threads.map((t) => ({
          status: "regular",
          remoteId: t.id,
          title: t.title,
          externalId: void 0
        }))
      };
    },
    async initialize(localThreadId) {
      const existing = threadIdMap.get(localThreadId);
      if (existing) return { remoteId: existing, externalId: void 0 };
      const inflight = pendingInits.get(localThreadId);
      if (inflight) {
        const remoteId2 = await inflight;
        return { remoteId: remoteId2, externalId: void 0 };
      }
      const { baseUrl, agentId, resourceId, headers } = cfg();
      const promise = apiCreateThread(baseUrl, agentId, resourceId, headers).then((thread) => {
        threadIdMap.set(localThreadId, thread.id);
        pendingInits.delete(localThreadId);
        return thread.id;
      });
      pendingInits.set(localThreadId, promise);
      const remoteId = await promise;
      return { remoteId, externalId: void 0 };
    },
    async fetch(threadId) {
      const { baseUrl, agentId, headers } = cfg();
      const thread = await apiFetchThread(baseUrl, agentId, threadId, headers);
      return {
        status: "regular",
        remoteId: thread.id,
        title: thread.title,
        externalId: void 0
      };
    },
    async rename(threadId, newTitle) {
      const { baseUrl, agentId, headers } = cfg();
      await apiRenameThread(baseUrl, agentId, threadId, newTitle, headers);
    },
    async archive(threadId) {
      const { baseUrl, agentId, headers } = cfg();
      await apiDeleteThread(baseUrl, agentId, threadId, headers);
    },
    async unarchive() {
    },
    async delete(threadId) {
      const { baseUrl, agentId, headers } = cfg();
      await apiDeleteThread(baseUrl, agentId, threadId, headers);
    },
    async generateTitle(threadId, messages) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const rawContent = firstUserMsg?.content;
      const text = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.filter((p) => p.type === "text" && p.text).map((p) => p.text).join(" ") : "";
      if (!text) {
        return createAssistantStream((controller) => {
          controller.close();
        });
      }
      const { baseUrl, agentId, headers, titleAgent } = cfg();
      let title;
      if (titleAgent?.enabled && titleAgent.agentId) {
        try {
          const resolved = await resolveHeaders(headers);
          const res = await fetch(
            `${baseUrl}/api/agents/${encodeURIComponent(titleAgent.agentId)}/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", ...resolved },
              body: JSON.stringify({
                messages: [{ role: "user", content: text }]
              })
            }
          );
          if (res.ok) {
            const data = await res.json();
            title = data.text?.trim() || text.slice(0, 60).trim();
          } else {
            title = text.slice(0, 60).trim();
          }
        } catch {
          title = text.slice(0, 60).trim();
        }
      } else {
        title = text.slice(0, 60).trim();
      }
      title = title || "New Chat";
      await apiRenameThread(baseUrl, agentId, threadId, title, headers).catch(() => {
      });
      return createAssistantStream((controller) => {
        controller.appendText(title);
        controller.close();
      });
    }
  };
}
function createThreadRuntimeHook(configRef, threadIdMap, pendingInits) {
  return function useThreadRuntime() {
    const cfg = configRef.current;
    const threadId = useAuiState((s) => s.threadListItem.id);
    const chatUrl = `${cfg.baseUrl}${cfg.chatPath ?? "/chat"}/${cfg.agentId}`;
    const aui = useAui();
    const auiRef = useRef2(aui);
    auiRef.current = aui;
    const transport = useMemo2(
      () => new AssistantChatTransport2({
        api: chatUrl,
        // Resolved per request, so the latest auth token is always used.
        headers: () => resolveHeaders(configRef.current.headers),
        prepareSendMessagesRequest: async (options) => {
          const resolved = await resolveThreadIdAsync(
            threadId,
            threadIdMap,
            pendingInits,
            async () => {
              const item = auiRef.current.threadListItem;
              return item.source ? item.initialize() : void 0;
            }
          );
          return {
            ...options,
            body: {
              ...options.body,
              messages: options.messages,
              trigger: options.trigger,
              memory: {
                thread: resolved,
                resource: configRef.current.resourceId
              }
            }
          };
        }
      }),
      [threadId, chatUrl]
    );
    const { baseUrl, agentId } = cfg;
    const historyAdapter = useMemo2(
      () => createHistoryAdapter({
        threadId: () => {
          const item = auiRef.current.threadListItem;
          return item.source ? item.getState().remoteId : null;
        },
        baseUrl,
        agentId,
        headers: () => resolveHeaders(configRef.current.headers)
      }),
      [baseUrl, agentId]
    );
    return useChatRuntime({ transport, adapters: { history: historyAdapter } });
  };
}
function useMastraThreadListRuntime(config) {
  const configRef = useRef2(config);
  configRef.current = config;
  const threadIdMap = useRef2(/* @__PURE__ */ new Map()).current;
  const pendingInits = useRef2(/* @__PURE__ */ new Map()).current;
  const runtimeHook = useMemo2(
    () => createThreadRuntimeHook(configRef, threadIdMap, pendingInits),
    [threadIdMap, pendingInits]
  );
  const adapter = useMemo2(
    () => createThreadListAdapter(configRef, threadIdMap, pendingInits),
    [threadIdMap, pendingInits]
  );
  return useRemoteThreadListRuntime({
    runtimeHook,
    adapter
  });
}
export {
  createHistoryAdapter,
  memoryKeys,
  useMastraChat,
  useMastraMemory,
  useMastraThreadListRuntime
};
//# sourceMappingURL=index.js.map