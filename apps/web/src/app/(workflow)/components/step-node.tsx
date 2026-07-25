"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HANDLE_CLASS } from "../lib/graph-config";
import { formatDuration, formatStepName, statusConfig } from "../lib/step-status";
import type { WorkflowStepResult } from "../lib/types";

export type StepNodeData = {
  step: WorkflowStepResult;
  /** Short description of what the step does. */
  description?: string;
  /** Wall-clock duration of the step in ms (available for historical runs). */
  durationMs?: number;
  /** Node width in px, resolved by the graph from the page's canvas config. */
  width: number;
  /** Whether the node has output that can be expanded. */
  expandable: boolean;
  /** Current expanded state (only meaningful when `expandable`). */
  expanded: boolean;
  /**
   * Custom rendering for the step's output, declared by the workflow page.
   * When unset, the output renders as raw JSON.
   */
  outputContent?: ReactNode;
  onToggle: (open: boolean) => void;
  /**
   * Content rendered inline while this step is suspended (e.g. a generic
   * resume form or option picker).
   */
  suspendContent?: ReactNode;
};

export type StepNodeType = Node<StepNodeData, "step">;

export function StepNode({ data }: NodeProps<StepNodeType>) {
  const { step, description, durationMs, width, expandable, expanded, outputContent, onToggle } =
    data;
  const { suspendContent } = data;
  const cfg = statusConfig[step.status] ?? statusConfig.waiting;
  const Icon = cfg.icon;
  const isSuspended = step.status === "suspended" && suspendContent != null;

  // Prefer an explicitly-passed duration (historical runs); fall back to
  // timing fields if the live stream happens to include them.
  const liveTiming = step as unknown as { startedAt?: number; endedAt?: number };
  const duration =
    durationMs ??
    (typeof liveTiming.startedAt === "number" && typeof liveTiming.endedAt === "number"
      ? liveTiming.endedAt - liveTiming.startedAt
      : undefined);

  const titleRow = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`size-4 shrink-0 ${cfg.color} ${cfg.spin ? "animate-spin" : ""}`} />
        <span className="truncate text-sm font-medium">{formatStepName(step.name)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {duration !== undefined && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatDuration(duration)}
          </span>
        )}
        <span className={`text-xs capitalize ${cfg.color}`}>{cfg.label}</span>
        {expandable && (
          <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
        )}
      </div>
    </div>
  );

  const desc = description ? (
    <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
  ) : null;

  return (
    <div
      className="pointer-events-auto rounded-2xl border bg-background shadow-sm"
      style={{ width }}
    >
      <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />

      {isSuspended ? (
        <div>
          <div className="px-3 py-2.5">
            {titleRow}
            {desc}
          </div>
          <div className="nodrag nopan px-3 pb-3">{suspendContent}</div>
        </div>
      ) : expandable ? (
        <Collapsible open={expanded} onOpenChange={onToggle}>
          <CollapsibleTrigger className="group block w-full cursor-pointer px-3 py-2.5 text-left">
            {titleRow}
            {desc}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {outputContent ?? (
              <pre className="mt-1 max-h-64 overflow-auto rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {typeof step.output === "string"
                  ? step.output
                  : JSON.stringify(step.output, null, 2)}
              </pre>
            )}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="px-3 py-2.5">
          {titleRow}
          {desc}
        </div>
      )}

      {step.status === "failed" && (
        <p className="px-3 pb-2.5 text-xs text-destructive">Step failed</p>
      )}

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
    </div>
  );
}
