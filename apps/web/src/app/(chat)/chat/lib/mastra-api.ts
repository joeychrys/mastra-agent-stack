/**
 * Pure fetch functions for the Mastra Memory API.
 * No React — safe to use in hooks, adapters, or server code.
 */

import type { MastraThread, MastraThreadListResponse } from "@repo/shared-types";
import { AGENT_IDS } from "@repo/shared-types";
import { getAuthToken } from "../hooks/use-auth-token";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";
const AGENT_ID = AGENT_IDS.weather;

// Placeholder — the server overrides this with the authenticated user's ID
// via MASTRA_RESOURCE_ID_KEY middleware, but the API schema still requires it.
const RESOURCE_ID = "authenticated-user";

export type { MastraThread, MastraThreadListResponse };
export { AGENT_ID, MASTRA_BASE_URL, RESOURCE_ID };

// ---------------------------------------------------------------------------
// Generic fetch helper (automatically injects JWT Bearer token)
// ---------------------------------------------------------------------------

export async function mastraFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${MASTRA_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Mastra API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Thread CRUD
// ---------------------------------------------------------------------------

export async function listThreads(): Promise<MastraThreadListResponse> {
  return mastraFetch<MastraThreadListResponse>(
    `/api/memory/threads?agentId=${AGENT_ID}&resourceId=${RESOURCE_ID}`,
  );
}

export async function fetchThread(threadId: string): Promise<MastraThread> {
  return mastraFetch<MastraThread>(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`);
}

export async function createThread(title = "New Chat"): Promise<MastraThread> {
  return mastraFetch<MastraThread>(`/api/memory/threads?agentId=${AGENT_ID}`, {
    method: "POST",
    body: JSON.stringify({
      resourceId: RESOURCE_ID,
      title,
      metadata: {},
    }),
  });
}

export async function renameThread(threadId: string, title: string): Promise<void> {
  await mastraFetch(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteThread(threadId: string): Promise<void> {
  await mastraFetch(`/api/memory/threads/${threadId}?agentId=${AGENT_ID}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Returns raw Mastra messages — the shape matches `MessageListInput` from
 * `@mastra/core/agent/message-list` and can be passed directly to
 * `toAISdkV5Messages()`.
 */
export async function fetchThreadMessages(threadId: string): Promise<Record<string, unknown>[]> {
  const token = await getAuthToken();
  const res = await fetch(
    `${MASTRA_BASE_URL}/api/memory/threads/${threadId}/messages?agentId=${AGENT_ID}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    uiMessages?: Record<string, unknown>[];
    messages?: Record<string, unknown>[];
  };
  return data?.uiMessages ?? data?.messages ?? [];
}

// ---------------------------------------------------------------------------
// Query key factory (co-located with the API for easy imports)
// ---------------------------------------------------------------------------

export const threadKeys = {
  all: ["threads"] as const,
  list: () => [...threadKeys.all, "list"] as const,
  detail: (id: string) => [...threadKeys.all, "detail", id] as const,
  messages: (id: string) => [...threadKeys.all, "messages", id] as const,
};
