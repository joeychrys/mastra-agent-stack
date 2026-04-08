/**
 * Shared fetch utilities for the Mastra memory API.
 *
 * Internal module — not exported from the package entry point.
 */

import type { HeadersConfig } from "../types";

// ---------------------------------------------------------------------------
// Header helpers
// ---------------------------------------------------------------------------

/** Resolve `HeadersConfig` (static, sync fn, or async fn) into a plain object. */
export const resolveHeaders = async (headers?: HeadersConfig): Promise<Record<string, string>> => {
  if (!headers) return {};
  if (typeof headers === "function") return await headers();
  return headers;
};

/** Normalise `HeadersConfig` into the thunk shape `AssistantChatTransport` expects. */
export const normaliseHeaders = (
  headers?: HeadersConfig,
): (() => Record<string, string> | Promise<Record<string, string>>) | undefined => {
  if (!headers) return undefined;
  if (typeof headers === "function") return headers;
  return () => headers;
};

// ---------------------------------------------------------------------------
// Typed fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Fetch wrapper for the Mastra API.
 *
 * Resolves headers, injects `Content-Type`, and handles empty bodies (204).
 * Throws on non-OK responses.
 */
export async function mastraFetch<T>(
  url: string,
  headers?: HeadersConfig,
  init?: RequestInit,
): Promise<T> {
  const resolved = await resolveHeaders(headers);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...resolved,
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    throw new Error(`Mastra API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as unknown as T;
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Raw message fetch
// ---------------------------------------------------------------------------

/**
 * Fetch raw messages from the Mastra memory API.
 *
 * Returns untyped message objects suitable for `toAISdkV5Messages`.
 * Handles both `uiMessages` and `messages` response shapes — the API schema
 * declares both, but currently only `messages` is populated by `recall()`.
 *
 * Returns `[]` on non-OK responses (e.g. 404 for a thread that was just created).
 */
export async function fetchRawMessages(
  baseUrl: string,
  agentId: string,
  threadId: string,
  headers?: HeadersConfig,
): Promise<Record<string, unknown>[]> {
  const resolved = await resolveHeaders(headers);
  const res = await fetch(
    `${baseUrl}/api/memory/threads/${threadId}/messages?agentId=${encodeURIComponent(agentId)}`,
    { headers: { ...resolved } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    uiMessages?: Record<string, unknown>[];
    messages?: Record<string, unknown>[];
  };
  return data?.uiMessages ?? data?.messages ?? [];
}
