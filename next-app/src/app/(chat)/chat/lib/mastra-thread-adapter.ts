import type {
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  ThreadHistoryAdapter,
} from '@assistant-ui/react';
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui';
import {
  createThread,
  deleteThread,
  fetchThread,
  fetchThreadMessages,
  listThreads,
  renameThread,
  threadKeys,
} from './mastra-api';
import { queryClient } from './query-client';

// ---------------------------------------------------------------------------
// Local → remote thread ID resolution
// ---------------------------------------------------------------------------
// assistant-ui assigns temporary IDs like `__LOCALID_xxx` to new threads.
// The adapter's `initialize()` creates the real server-side thread, but due
// to a race condition the transport's `prepareSendMessagesRequest` callback
// can fire BEFORE `initialize()` completes (the AssistantChatTransport
// relies on `this.runtime` which may not be set yet).
//
// To handle this we store the *pending* initialization promise so that
// `resolveThreadIdAsync()` can await it before resolving the ID.
// ---------------------------------------------------------------------------

/** Completed mappings: localId → remoteId */
const threadIdMap = new Map<string, string>();

/** In-flight initialization promises: localId → Promise<remoteId> */
const pendingInits = new Map<string, Promise<string>>();

/**
 * Synchronous resolve — returns the remote UUID if already known,
 * otherwise falls back to the input.  Use for non-critical paths
 * (e.g. history adapter creation during render).
 */
export function resolveThreadId(threadId: string): string {
  return threadIdMap.get(threadId) ?? threadId;
}

/**
 * Async resolve — if an `initialize()` is in flight for this local ID,
 * awaits it first so the caller always gets the real remote UUID.
 * Use inside `prepareSendMessagesRequest` to guarantee correctness.
 */
export async function resolveThreadIdAsync(threadId: string): Promise<string> {
  const pending = pendingInits.get(threadId);
  if (pending) {
    return pending;
  }
  return threadIdMap.get(threadId) ?? threadId;
}

// ---------------------------------------------------------------------------
// Thread list adapter — backed by TanStack Query cache
// ---------------------------------------------------------------------------

export function createMastraThreadAdapter(): RemoteThreadListAdapter {
  return {
    async list() {
      const data = await queryClient.fetchQuery({
        queryKey: threadKeys.list(),
        queryFn: listThreads,
      });
      return {
        threads: data.threads.map((t) => ({
          status: 'regular' as const,
          remoteId: t.id,
          title: t.title,
          externalId: undefined,
        })),
      };
    },

    async initialize(localThreadId: string) {
      // Guard: already completed
      const existing = threadIdMap.get(localThreadId);
      if (existing) {
        return { remoteId: existing, externalId: undefined };
      }

      // Guard: already in-flight (runtime may call initialize() repeatedly)
      const inflight = pendingInits.get(localThreadId);
      if (inflight) {
        const remoteId = await inflight;
        return { remoteId, externalId: undefined };
      }

      // Create the server-side thread and store a promise so that
      // concurrent callers (e.g. prepareSendMessagesRequest) can await it.
      const promise = createThread().then((thread) => {
        threadIdMap.set(localThreadId, thread.id);
        pendingInits.delete(localThreadId);
        return thread.id;
      });
      pendingInits.set(localThreadId, promise);

      const remoteId = await promise;
      // Invalidate the list so the new thread shows up immediately
      void queryClient.invalidateQueries({ queryKey: threadKeys.list() });
      return {
        remoteId,
        externalId: undefined,
      };
    },

    async fetch(threadId: string) {
      const thread = await queryClient.fetchQuery({
        queryKey: threadKeys.detail(threadId),
        queryFn: () => fetchThread(threadId),
      });
      return {
        status: 'regular' as const,
        remoteId: thread.id,
        title: thread.title,
        externalId: undefined,
      };
    },

    async rename(threadId: string, newTitle: string) {
      await renameThread(threadId, newTitle);
      void queryClient.invalidateQueries({ queryKey: threadKeys.list() });
      void queryClient.invalidateQueries({ queryKey: threadKeys.detail(threadId) });
    },

    async archive(threadId: string) {
      await deleteThread(threadId);
      void queryClient.invalidateQueries({ queryKey: threadKeys.list() });
      queryClient.removeQueries({ queryKey: threadKeys.detail(threadId) });
      queryClient.removeQueries({ queryKey: threadKeys.messages(threadId) });
    },

    async unarchive(_threadId: string) {
      // Mastra doesn't support unarchive — threads are hard-deleted
    },

    async delete(threadId: string) {
      await deleteThread(threadId);
      void queryClient.invalidateQueries({ queryKey: threadKeys.list() });
      queryClient.removeQueries({ queryKey: threadKeys.detail(threadId) });
      queryClient.removeQueries({ queryKey: threadKeys.messages(threadId) });
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

// ---------------------------------------------------------------------------
// History adapter — uses TanStack Query to cache loaded messages
// ---------------------------------------------------------------------------

export function createMastraHistoryAdapter(threadId: string): ThreadHistoryAdapter {
  return {
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
            const raw = await queryClient.fetchQuery({
              queryKey: threadKeys.messages(threadId),
              queryFn: () => fetchThreadMessages(threadId),
            });
            if (!raw?.length)
              return { messages: [] as { parentId: string | null; message: TMessage }[] };

            const uiMessages = toAISdkV5Messages(raw as Parameters<typeof toAISdkV5Messages>[0]);
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
          // No-op — Mastra's agent memory already persists messages.
          // Invalidate so the next load picks up new messages from the server.
          void queryClient.invalidateQueries({ queryKey: threadKeys.messages(threadId) });
        },
      };
    },
  };
}
