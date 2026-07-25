"use client";

import { useEffect, useRef, useState } from "react";
import type { HeadersConfig } from "../lib/types";

// ---------------------------------------------------------------------------
// useMastraWorkflowDefinition
//
// Fetches a workflow's static structure from Mastra's built-in
// `GET /api/workflows/:workflowId` endpoint and parses its `stepGraph` into an
// ordered list of steps. Use this to render a workflow diagram before (and
// independently of) any run.
// ---------------------------------------------------------------------------

/** A single step parsed from the workflow's `stepGraph`, in execution order. */
export type WorkflowStepDef = {
  /** Step id — matches the keys in a run's `WorkflowData.steps`. */
  id: string;
  /** Human-readable description from the step definition. */
  description?: string;
  /** Whether this step can suspend for user input. */
  canSuspend: boolean;
  /**
   * Top-level fields of the step's `resumeSchema` (from the workflow's
   * `steps` map). Drives a generic resume form when the step suspends.
   */
  resumeFields: WorkflowInputField[];
};

/**
 * One visual row of the workflow graph, in execution order.
 *
 * - `step`        — a single sequential step.
 * - `parallel`    — steps that run simultaneously (`.parallel()`); all execute.
 * - `conditional` — mutually exclusive branches (`.branch()`); exactly one
 *                   executes, the others are skipped.
 */
export type WorkflowGraphRow =
  | { kind: "step"; step: WorkflowStepDef }
  | { kind: "parallel"; steps: WorkflowStepDef[] }
  | { kind: "conditional"; steps: WorkflowStepDef[] };

/** A top-level field of the workflow's input schema. */
export type WorkflowInputField = {
  name: string;
  /** JSON-schema type (e.g. "string", "number"). */
  type?: string;
  /** Field description from the schema (useful as a placeholder/label). */
  description?: string;
  required: boolean;
};

export type MastraWorkflowDefinition = {
  name: string;
  description?: string;
  /** Graph rows preserving parallel/conditional structure. */
  rows: WorkflowGraphRow[];
  /** All steps flattened in execution order (derived from `rows`). */
  steps: WorkflowStepDef[];
  /** Top-level fields parsed from the workflow's `inputSchema`. */
  inputFields: WorkflowInputField[];
};

export type MastraWorkflowDefinitionConfig = {
  /** Base URL of the Mastra server (e.g. "http://localhost:4111"). */
  baseUrl: string;
  /** Workflow ID (must match a registered workflow on the server). */
  workflowId: string;
  /**
   * Path prefix for the workflows API.
   * The full URL is `${baseUrl}${apiPath}/${workflowId}`.
   * @default "/api/workflows"
   */
  apiPath?: string;
  /** Headers for authentication (e.g. JWT Bearer token). */
  headers?: HeadersConfig;
};

export type MastraWorkflowDefinitionReturn = {
  /** The parsed definition, or null until loaded. */
  definition: MastraWorkflowDefinition | null;
  /** Graph rows preserving parallel/conditional structure. */
  rows: WorkflowGraphRow[];
  /** Ordered steps (stable empty array until loaded). */
  steps: WorkflowStepDef[];
  /** Parsed workflow input fields (stable empty array until loaded). */
  inputFields: WorkflowInputField[];
  isLoading: boolean;
  error: Error | null;
};

// Stable references so consumers' effects don't re-run while loading.
const EMPTY_ROWS: WorkflowGraphRow[] = [];
const EMPTY_STEPS: WorkflowStepDef[] = [];
const EMPTY_FIELDS: WorkflowInputField[] = [];

type StepGraphEntry = {
  type?: string;
  step?: { id?: string; description?: string; canSuspend?: boolean };
  steps?: unknown;
};

async function resolveHeaders(headers?: HeadersConfig): Promise<Record<string, string>> {
  if (!headers) return {};
  if (typeof headers === "function") return await headers();
  return headers;
}

/**
 * Parse a `stepGraph` into ordered graph rows, preserving parallel and
 * conditional structure:
 *
 * - `{ type: "step", step }`                     → a sequential row.
 * - `{ type: "parallel", steps: [...] }`         → one row, steps side by side.
 * - `{ type: "conditional", steps: [...] }`      → one row, branches side by side.
 * - other container types with a `steps` array   → flattened into sequential
 *   rows (best effort for loop/foreach shapes).
 *
 * `stepGraph` entries only carry a `canSuspend` flag; the actual schemas live
 * in the workflow's `steps` map, so resume fields are looked up there by id.
 */
function parseStepGraph(
  stepGraph: unknown,
  stepsById: Record<string, { resumeSchema?: unknown } | undefined>,
): WorkflowGraphRow[] {
  const rows: WorkflowGraphRow[] = [];
  const seen = new Set<string>();

  const toDef = (entry: StepGraphEntry): WorkflowStepDef | null => {
    const id = entry?.step?.id;
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      description: entry.step?.description,
      canSuspend: Boolean(entry.step?.canSuspend),
      resumeFields: parseSchemaFields(stepsById[id]?.resumeSchema),
    };
  };

  // Collect every step def inside a container, recursing into nested
  // containers (e.g. a workflow nested inside a parallel branch).
  const collect = (nodes: unknown, out: WorkflowStepDef[]) => {
    if (!Array.isArray(nodes)) return;
    for (const entry of nodes as StepGraphEntry[]) {
      const def = toDef(entry);
      if (def) out.push(def);
      if (Array.isArray(entry?.steps)) collect(entry.steps, out);
    }
  };

  if (!Array.isArray(stepGraph)) return rows;
  for (const entry of stepGraph as StepGraphEntry[]) {
    if (entry?.type === "parallel" || entry?.type === "conditional") {
      const steps: WorkflowStepDef[] = [];
      collect(entry.steps, steps);
      if (steps.length > 0) rows.push({ kind: entry.type, steps });
      continue;
    }
    const def = toDef(entry);
    if (def) {
      rows.push({ kind: "step", step: def });
    } else if (Array.isArray(entry?.steps)) {
      // Unknown container shape — flatten its steps sequentially.
      const steps: WorkflowStepDef[] = [];
      collect(entry.steps, steps);
      for (const step of steps) rows.push({ kind: "step", step });
    }
  }
  return rows;
}

/** Flatten graph rows into execution-ordered steps. */
function flattenRows(rows: WorkflowGraphRow[]): WorkflowStepDef[] {
  return rows.flatMap((row) => (row.kind === "step" ? [row.step] : row.steps));
}

/**
 * Parse a serialized schema (a JSON string wrapping a JSON schema under a
 * `json` key — superjson format) into a flat list of top-level fields.
 * Used for the workflow-level `inputSchema` and per-step `resumeSchema`.
 */
function parseSchemaFields(schema: unknown): WorkflowInputField[] {
  if (typeof schema !== "string") return [];
  try {
    const parsed = JSON.parse(schema) as {
      json?: {
        properties?: Record<string, { type?: string; description?: string }>;
        required?: string[];
      };
    };
    const properties = parsed?.json?.properties ?? {};
    const required = new Set(parsed?.json?.required ?? []);
    return Object.entries(properties).map(([name, prop]) => ({
      name,
      type: prop?.type,
      description: prop?.description,
      required: required.has(name),
    }));
  } catch {
    return [];
  }
}

export function useMastraWorkflowDefinition(
  config: MastraWorkflowDefinitionConfig,
): MastraWorkflowDefinitionReturn {
  const { baseUrl, workflowId, apiPath = "/api/workflows", headers } = config;

  const [definition, setDefinition] = useState<MastraWorkflowDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep the latest headers without making them an effect dependency — callers
  // typically pass an inline (async) function that changes identity each render.
  const headersRef = useRef(headers);
  headersRef.current = headers;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const resolved = await resolveHeaders(headersRef.current);
        const res = await fetch(`${baseUrl}${apiPath}/${workflowId}`, {
          headers: { accept: "application/json", ...resolved },
        });
        if (!res.ok) {
          throw new Error(`Failed to load workflow "${workflowId}" (${res.status})`);
        }
        const json = (await res.json()) as {
          name?: string;
          description?: string;
          stepGraph?: unknown;
          inputSchema?: unknown;
          steps?: Record<string, { resumeSchema?: unknown } | undefined>;
        };
        if (cancelled) return;
        const rows = parseStepGraph(json.stepGraph, json.steps ?? {});
        setDefinition({
          name: json.name ?? workflowId,
          description: json.description,
          rows,
          steps: flattenRows(rows),
          inputFields: parseSchemaFields(json.inputSchema),
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, workflowId, apiPath]);

  return {
    definition,
    rows: definition?.rows ?? EMPTY_ROWS,
    steps: definition?.steps ?? EMPTY_STEPS,
    inputFields: definition?.inputFields ?? EMPTY_FIELDS,
    isLoading,
    error,
  };
}
