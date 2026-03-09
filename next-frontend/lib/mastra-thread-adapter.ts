import type {
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";

const MASTRA_BASE_URL = "http://localhost:4111";
const RESOURCE_ID = "weather-agent";
const AGENT_ID = "weather-agent";

type MastraThread = {
  id: string;
  resourceId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type MastraThreadListResponse = {
  threads: MastraThread[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

async function mastraFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${MASTRA_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Mastra API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function createMastraThreadAdapter(): RemoteThreadListAdapter {
  return {
    async list() {
      const data = await mastraFetch<MastraThreadListResponse>(
        `/api/memory/threads?agentId=${AGENT_ID}&resourceId=${RESOURCE_ID}`,
      );
      return {
        threads: data.threads.map((t) => ({
          status: "regular" as const,
          remoteId: t.id,
          title: t.title,
          externalId: undefined,
        })),
      };
    },

    async initialize(_threadId: string) {
      const thread = await mastraFetch<MastraThread>(`/api/memory/threads?agentId=${AGENT_ID}`, {
        method: "POST",
        body: JSON.stringify({
          resourceId: RESOURCE_ID,
          title: "New Chat",
          metadata: {},
        }),
      });
      return {
        remoteId: thread.id,
        externalId: undefined,
      };
    },

    async fetch(threadId: string) {
      const thread = await mastraFetch<MastraThread>(
        `/api/memory/threads/${threadId}?agentId=${AGENT_ID}`,
      );
      return {
        status: "regular" as const,
        remoteId: thread.id,
        title: thread.title,
        externalId: undefined,
      };
    },

    async rename(threadId: string, newTitle: string) {
      await mastraFetch(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
      });
    },

    async archive(threadId: string) {
      await mastraFetch(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`, {
        method: "DELETE",
      });
    },

    async unarchive(_threadId: string) {
      // Mastra doesn't support unarchive — threads are hard-deleted
    },

    async delete(threadId: string) {
      await mastraFetch(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`, {
        method: "DELETE",
      });
    },

    async generateTitle(_threadId: string, _messages: readonly unknown[]) {
      // Return an empty ReadableStream — we don't auto-generate titles
      return new ReadableStream({
        start(c) {
          c.close();
        },
      }) as never;
    },
  };
}

async function loadMastraMessages(threadId: string) {
  const res = await fetch(
    `${MASTRA_BASE_URL}/api/memory/threads/${threadId}/messages?agentId=${AGENT_ID}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  const raw = data?.uiMessages ?? data?.messages;
  if (!raw?.length) return [];
  return toAISdkV5Messages(raw);
}

export function createMastraHistoryAdapter(threadId: string): ThreadHistoryAdapter {
  return {
    // Top-level load/append satisfy the interface but are unused when withFormat is present
    async load() {
      return { messages: [] } as never;
    },

    async append() {
      // No-op — Mastra's agent memory already persists messages
    },

    withFormat<TMessage>() {
      return {
        async load() {
          try {
            const uiMessages = await loadMastraMessages(threadId);
            let parentId: string | null = null;
            return {
              messages: uiMessages.map((msg) => {
                const item = { parentId, message: msg as TMessage };
                parentId = msg.id;
                return item;
              }),
            };
          } catch {
            return { messages: [] as { parentId: string | null; message: TMessage }[] };
          }
        },

        async append() {
          // No-op — Mastra's agent memory already persists messages
        },
      };
    },
  };
}
