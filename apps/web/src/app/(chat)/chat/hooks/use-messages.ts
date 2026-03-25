import { useQuery } from "@tanstack/react-query";
import { fetchThreadMessages, threadKeys } from "../lib/mastra-api";

/**
 * Fetch all messages for a thread.
 *
 * Returns raw Mastra messages — callers can convert them with
 * `toAISdkV5Messages()` from `@mastra/ai-sdk/ui` if needed.
 */
export function useThreadMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: threadKeys.messages(threadId ?? ""),
    queryFn: () => fetchThreadMessages(threadId ?? ""),
    enabled: !!threadId,
    // Messages change as the conversation progresses — keep a shorter stale time
    staleTime: 5 * 1000,
  });
}
