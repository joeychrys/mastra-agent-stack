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

    async initialize(_threadId: string) {
      const thread = await createThread();
      // Invalidate the list so new thread shows up immediately
      void queryClient.invalidateQueries({ queryKey: threadKeys.list() });
      return {
        remoteId: thread.id,
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
