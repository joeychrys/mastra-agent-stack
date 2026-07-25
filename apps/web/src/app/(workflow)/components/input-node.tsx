"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { History, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import type { WorkflowInputField } from "../hooks/use-workflow-definition";
import { HANDLE_CLASS } from "../lib/graph-config";

export type InputNodeData = {
  /** Node heading (workflow display name or first field label). */
  label: string;
  /** Short description shown under the label. */
  description?: string;
  /** Node width in px, resolved by the graph from the page's canvas config. */
  width: number;
  /** Page-owned form or trigger rendered inside the graph node shell. */
  content?: ReactNode;
  /** Input fields parsed from the workflow definition. */
  fields: WorkflowInputField[];
  /** Original input shown when replaying a historical run. */
  replayValue?: Record<string, unknown>;
};

// NOTE: the type name must not be "input" — that's a React Flow built-in node
// type whose default styles (white card chrome) would render behind the
// custom component.
export type InputNodeType = Node<InputNodeData, "workflowInput">;

/**
 * A single scalar input (the common case, e.g. `{ city: "Dallas" }`) reads
 * better as plain text than as JSON. Anything else falls back to JSON.
 */
function scalarInput(value: Record<string, unknown>): string | undefined {
  const entries = Object.entries(value);
  if (entries.length !== 1) return undefined;
  const only = entries[0][1];
  if (typeof only === "string" || typeof only === "number" || typeof only === "boolean") {
    return String(only);
  }
  return undefined;
}

export function InputNode({ data }: NodeProps<InputNodeType>) {
  const { label, description, width, content, fields, replayValue } = data;
  const replayScalar = replayValue ? scalarInput(replayValue) : undefined;
  const body = replayValue ? (
    <div className="pointer-events-none rounded-xl border bg-muted/50 px-3 py-2">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <History className="size-3.5" />
        Historical input
      </div>
      {replayScalar !== undefined ? (
        <p className="truncate text-sm">{replayScalar}</p>
      ) : (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(replayValue, null, 2)}
        </pre>
      )}
    </div>
  ) : content !== undefined ? (
    content
  ) : (
    <div className="pointer-events-none rounded-xl border border-dashed bg-muted/30 px-3 py-2.5">
      <p className="mb-2 text-xs text-muted-foreground">No input component configured.</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
        {JSON.stringify(fields, null, 2)}
      </pre>
    </div>
  );

  return (
    <div
      className="pointer-events-auto rounded-2xl border bg-background shadow-sm"
      style={{ width }}
    >
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-2">
          <PenLine className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {description && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="nodrag nopan px-3 pb-3 pt-2">{body}</div>

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
    </div>
  );
}
