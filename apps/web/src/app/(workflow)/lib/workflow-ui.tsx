"use client";

import type { ReactNode } from "react";
import { ActivityCard } from "../components/activity-card";

// ---------------------------------------------------------------------------
// Workflow UI registry — optional per-workflow presentation overrides.
//
// The workflow page at /workflows/[workflowId] is fully generic: structure,
// input form, and suspend/resume UI all derive from the Mastra API. Entries
// here only add polish (display names, structured output cards) for known
// workflows; unknown workflow ids fall back to generic rendering everywhere.
// ---------------------------------------------------------------------------

export type WorkflowUIConfig = {
  /** Display name for the header/sidebar (falls back to the API name). */
  displayName?: string;
  /** Copy shown under the input node's heading. */
  inputDescription?: string;
  /** Sidebar empty state (falls back to a generic message). */
  emptyMessage?: string;
  /**
   * Custom output rendering per step. Return undefined to fall back to the
   * raw-JSON default for that step.
   */
  renderStepOutput?: (stepId: string, output: unknown) => ReactNode | undefined;
};

const configs: Record<string, WorkflowUIConfig> = {
  "weather-workflow": {
    displayName: "Activity Planner",
    inputDescription:
      "Enter any city to start. This kicks off the weather lookup and activity planning below.",
    emptyMessage: "No runs yet. Enter a city to start one.",
    renderStepOutput: (stepId, output) =>
      stepId === "plan-activities" ? <ActivityCard data={output} /> : undefined,
  },
};

const EMPTY_CONFIG: WorkflowUIConfig = {};

/** Presentation overrides for a workflow, or an empty config when unknown. */
export function getWorkflowUI(workflowId: string): WorkflowUIConfig {
  return configs[workflowId] ?? EMPTY_CONFIG;
}
