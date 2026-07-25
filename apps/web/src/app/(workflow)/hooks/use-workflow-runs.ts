"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HeadersConfig,
  WorkflowData,
  WorkflowStepResult,
  WorkflowStepStatus,
} from "../lib/types";

// ---------------------------------------------------------------------------
// useMastraWorkflowRuns
//
// Fetches a workflow's run history from Mastra's built-in
// `GET /api/workflows/:workflowId/runs` endpoint and normalizes each stored
// snapshot into a summary that can hydrate a workflow UI (per-step status,
// output, and timing). Supports server-side filtering by `resourceId` so
// history is scoped per user.
// ---------------------------------------------------------------------------

/** Per-step state captured in a stored run snapshot. */
export type WorkflowRunStep = {
  status: WorkflowStepStatus;
  /** The step's input payload. */
  input: Record<string, unknown> | null;
  output: unknown | null;
  suspendPayload: Record<string, unknown> | null;
  /** Epoch ms — present for executed steps. */
  startedAt?: number;
  endedAt?: number;
};

/** A normalized historical workflow run. */
export type WorkflowRunSummary = {
  runId: string;
  workflowName: string;
  /** Overall run status (e.g. "success" | "failed" | "suspended" | "pending" | "running"). */
  status: string;
  /** ISO timestamp of when the run was persisted. */
  createdAt: string;
  /** The workflow's original input (the `context.input` of the snapshot). */
  input: Record<string, unknown> | null;
  /** The workflow's final output, when the run succeeded. */
  result: unknown | null;
  /** Per-step snapshots keyed by step id. Steps never reached are absent. */
  steps: Record<string, WorkflowRunStep>;
  /** Total wall-clock duration across executed steps, in ms. */
  durationMs: number | null;
};

export type MastraWorkflowRunsConfig = {
  /** Base URL of the Mastra server. */
  baseUrl: string;
  /** Workflow ID (must match a registered workflow on the server). */
  workflowId: string;
  /**
   * Filter runs to this resource (typically the authenticated user's id).
   * Sent as the `resourceId` query param — the server filters storage-side.
   */
  resourceId?: string;
  /**
   * Path prefix for the workflows API.
   * @default "/api/workflows"
   */
  apiPath?: string;
  /** Headers for authentication (e.g. JWT Bearer token). */
  headers?: HeadersConfig;
  /** Page size. @default 20 */
  perPage?: number;
  /** Skip fetching while false (e.g. session still loading). @default true */
  enabled?: boolean;
};

export type MastraWorkflowRunsReturn = {
  /** Runs sorted newest-first. Stable empty array until loaded. */
  runs: WorkflowRunSummary[];
  isLoading: boolean;
  error: Error | null;
  /** Re-fetch the run list (e.g. after a run completes). */
  refresh: () => void;
  /** Permanently delete a stored run. Resolves after the list is updated. */
  deleteRun: (runId: string) => Promise<void>;
  /** Cancel an in-flight run (status becomes "canceled"), then refresh. */
  cancelRun: (runId: string) => Promise<void>;
};

const EMPTY_RUNS: WorkflowRunSummary[] = [];

const VALID_STEP_STATUSES = new Set<WorkflowStepStatus>([
  "running",
  "success",
  "failed",
  "suspended",
  "waiting",
]);

async function resolveHeaders(headers?: HeadersConfig): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") return await headers();
  return headers;
}

type RawStepContext = {
  status?: string;
  output?: unknown;
  payload?: Record<string, unknown>;
  suspendPayload?: Record<string, unknown>;
  startedAt?: number;
  endedAt?: number;
};

type RawRun = {
  runId?: string;
  workflowName?: string;
  createdAt?: string;
  snapshot?: {
    status?: string;
    result?: unknown;
    context?: Record<string, RawStepContext | unknown>;
  };
};

function toStepStatus(status: string | undefined): WorkflowStepStatus {
  return VALID_STEP_STATUSES.has(status as WorkflowStepStatus)
    ? (status as WorkflowStepStatus)
    : "waiting";
}

function normalizeRun(raw: RawRun): WorkflowRunSummary | null {
  if (!raw?.runId) return null;
  const context = raw.snapshot?.context ?? {};

  const steps: Record<string, WorkflowRunStep> = {};
  let minStart: number | null = null;
  let maxEnd: number | null = null;

  for (const [key, value] of Object.entries(context)) {
    if (key === "input") continue;
    const entry = value as RawStepContext;
    if (!entry || typeof entry !== "object" || typeof entry.status !== "string") continue;

    steps[key] = {
      status: toStepStatus(entry.status),
      input: entry.payload ?? null,
      output: entry.output ?? null,
      suspendPayload: entry.suspendPayload ?? null,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
    };

    if (typeof entry.startedAt === "number") {
      minStart = minStart === null ? entry.startedAt : Math.min(minStart, entry.startedAt);
    }
    if (typeof entry.endedAt === "number") {
      maxEnd = maxEnd === null ? entry.endedAt : Math.max(maxEnd, entry.endedAt);
    }
  }

  return {
    runId: raw.runId,
    workflowName: raw.workflowName ?? "",
    status: raw.snapshot?.status ?? "pending",
    createdAt: raw.createdAt ?? "",
    input: (context.input as Record<string, unknown> | undefined) ?? null,
    result: raw.snapshot?.result ?? null,
    steps,
    durationMs: minStart !== null && maxEnd !== null ? maxEnd - minStart : null,
  };
}

export function useMastraWorkflowRuns(config: MastraWorkflowRunsConfig): MastraWorkflowRunsReturn {
  const {
    baseUrl,
    workflowId,
    resourceId,
    apiPath = "/api/workflows",
    headers,
    perPage = 20,
    enabled = true,
  } = config;

  const [runs, setRuns] = useState<WorkflowRunSummary[]>(EMPTY_RUNS);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest headers without making them an effect dependency — callers
  // typically pass an inline (async) function that changes identity each render.
  const headersRef = useRef(headers);
  headersRef.current = headers;

  // Latest-request-wins: stale responses (from rapid refreshes or changed
  // params) are dropped instead of clobbering newer state.
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);

    try {
      const resolved = await resolveHeaders(headersRef.current);
      const params = new URLSearchParams({ perPage: String(perPage), page: "0" });
      if (resourceId) params.set("resourceId", resourceId);

      const res = await fetch(`${baseUrl}${apiPath}/${workflowId}/runs?${params}`, {
        headers: { accept: "application/json", ...resolved },
      });
      if (!res.ok) {
        throw new Error(`Failed to load runs for "${workflowId}" (${res.status})`);
      }
      const json = (await res.json()) as { runs?: RawRun[] };
      if (requestSeq.current !== seq) return;

      const normalized = (json.runs ?? [])
        .map(normalizeRun)
        .filter((r): r is WorkflowRunSummary => r !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRuns(normalized);
    } catch (err) {
      if (requestSeq.current === seq) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (requestSeq.current === seq) setIsLoading(false);
    }
  }, [baseUrl, workflowId, resourceId, apiPath, perPage]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const deleteRun = useCallback(
    async (runId: string) => {
      const resolved = await resolveHeaders(headersRef.current);
      const res = await fetch(`${baseUrl}${apiPath}/${workflowId}/runs/${runId}`, {
        method: "DELETE",
        headers: { accept: "application/json", ...resolved },
      });
      if (!res.ok) {
        throw new Error(`Failed to delete run "${runId}" (${res.status})`);
      }
      // Remove locally instead of refetching — the server already confirmed.
      setRuns((prev) => prev.filter((r) => r.runId !== runId));
    },
    [baseUrl, apiPath, workflowId],
  );

  const cancelRun = useCallback(
    async (runId: string) => {
      const resolved = await resolveHeaders(headersRef.current);
      const res = await fetch(`${baseUrl}${apiPath}/${workflowId}/runs/${runId}/cancel`, {
        method: "POST",
        headers: { accept: "application/json", ...resolved },
      });
      if (!res.ok) {
        throw new Error(`Failed to stop run "${runId}" (${res.status})`);
      }
      // Refetch so the run's status flips to "canceled" in the list.
      await load();
    },
    [baseUrl, apiPath, workflowId, load],
  );

  return { runs, isLoading, error, refresh, deleteRun, cancelRun };
}

// ---------------------------------------------------------------------------
// Adapters — hydrate a historical run into the live-run data shapes
// ---------------------------------------------------------------------------

/**
 * Convert a historical run into the `WorkflowData` shape produced by the live
 * stream, so the same UI can render either.
 */
export function workflowRunToWorkflowData(run: WorkflowRunSummary): WorkflowData {
  const steps: Record<string, WorkflowStepResult> = {};
  for (const [stepId, s] of Object.entries(run.steps)) {
    steps[stepId] = {
      name: stepId,
      status: s.status,
      input: s.input,
      output: s.output,
      suspendPayload: s.suspendPayload,
      resumePayload: null,
    };
  }
  return { name: run.workflowName, status: run.status, steps, output: null };
}

/** Per-step durations (ms) for a historical run, keyed by step id. */
export function workflowRunDurations(run: WorkflowRunSummary): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [stepId, s] of Object.entries(run.steps)) {
    if (typeof s.startedAt === "number" && typeof s.endedAt === "number") {
      out[stepId] = s.endedAt - s.startedAt;
    }
  }
  return out;
}
