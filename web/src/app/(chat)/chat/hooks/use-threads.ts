import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createThread,
  deleteThread,
  fetchThread,
  listThreads,
  renameThread,
  threadKeys,
} from '../lib/mastra-api';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all threads for the current agent/resource. */
export function useThreads() {
  return useQuery({
    queryKey: threadKeys.list(),
    queryFn: listThreads,
  });
}

/** Fetch a single thread by ID. */
export function useThread(threadId: string | undefined) {
  return useQuery({
    queryKey: threadKeys.detail(threadId!),
    queryFn: () => fetchThread(threadId!),
    enabled: !!threadId,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new thread and invalidate the list cache. */
export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => createThread(title),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: threadKeys.list() });
    },
  });
}

/** Rename a thread — optimistically updates the list cache. */
export function useRenameThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, title }: { threadId: string; title: string }) =>
      renameThread(threadId, title),
    onSuccess: (_data, { threadId }) => {
      void qc.invalidateQueries({ queryKey: threadKeys.list() });
      void qc.invalidateQueries({ queryKey: threadKeys.detail(threadId) });
    },
  });
}

/** Delete a thread and remove it from the list cache. */
export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => deleteThread(threadId),
    onSuccess: (_data, threadId) => {
      void qc.invalidateQueries({ queryKey: threadKeys.list() });
      qc.removeQueries({ queryKey: threadKeys.detail(threadId) });
      qc.removeQueries({ queryKey: threadKeys.messages(threadId) });
    },
  });
}
