// ---------------------------------------------------------------------------
// Workflow types — connection config and data shapes for Mastra workflows.
//
// These live in the app (not @repo/aui-mastra) because they are specific to
// workflow UIs; the shared package only covers general chat features.
// ---------------------------------------------------------------------------

/** Headers that can be static, a sync function, or an async function. */
export type HeadersConfig =
  | Record<string, string>
  | (() => Record<string, string>)
  | (() => Promise<Record<string, string>>);

/** Configuration for `useMastraWorkflow`. */
export type MastraWorkflowConfig = {
  /** Base URL of the Mastra server. */
  baseUrl: string;

  /** Workflow ID to execute (must match a registered workflow on the server). */
  workflowId: string;

  /**
   * Path prefix for the workflowRoute endpoint.
   * The full URL is `${baseUrl}${workflowPath}/${workflowId}`.
   * @default "/workflow"
   */
  workflowPath?: string;

  /** Headers for authentication. */
  headers?: HeadersConfig;

  /**
   * Resource ID to associate the workflow run with (e.g. a user identifier).
   * Sent in the request body so the server can tag the run for tracking/filtering.
   *
   * Note: The actual authenticated user ID is extracted from the JWT by server
   * middleware and set on the request context — this field is for run-level
   * resource association.
   */
  resourceId?: string;

  /**
   * Transform the user's text message into the workflow's `inputData`.
   * Called inside `prepareSendMessagesRequest` with the latest message text.
   *
   * Only used for plain-text sends (`sendInput("Dallas")`). Structured sends
   * (`sendInput({ city: "Dallas" })`) bypass this and are sent as-is.
   *
   * @default (text) => ({ input: text })
   * @example
   * ```ts
   * mapInput: (text) => ({ city: text })
   * ```
   */
  mapInput?: (text: string) => Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Workflow data part types (matches @mastra/ai-sdk WorkflowDataPart)
// ---------------------------------------------------------------------------

/**
 * Status of an individual workflow step.
 *
 * "skipped" is client-derived (not a Mastra status): a conditional branch
 * whose sibling executed while it did not.
 */
export type WorkflowStepStatus =
  | "running"
  | "success"
  | "failed"
  | "suspended"
  | "waiting"
  | "skipped";

/** Result of an individual workflow step from the `data-workflow` stream part. */
export type WorkflowStepResult = {
  name: string;
  status: WorkflowStepStatus;
  input: Record<string, unknown> | null;
  output: unknown | null;
  suspendPayload: Record<string, unknown> | null;
  resumePayload: Record<string, unknown> | null;
};

/** The `data` field inside a `data-workflow` message part. */
export type WorkflowData = {
  name: string;
  status: string;
  steps: Record<string, WorkflowStepResult>;
  output: {
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  } | null;
};
