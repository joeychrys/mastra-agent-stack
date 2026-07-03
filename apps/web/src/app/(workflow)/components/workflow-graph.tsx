"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type Edge,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkflowData, WorkflowStepResult } from "../lib/types";
import type {
  WorkflowGraphRow,
  WorkflowInputField,
  WorkflowStepDef,
} from "../lib/use-workflow-definition";
import { InputNode, type InputNodeType } from "./input-node";
import { StepNode, type StepNodeType } from "./step-node";

// Register node types once at module scope so React Flow doesn't warn about
// re-created objects on every render.
const nodeTypes = { workflowInput: InputNode, step: StepNode };

// The graph structure is fetched from the Mastra API (workflow `stepGraph`)
// and passed in as rows: sequential steps stack vertically, while parallel and
// conditional steps within a row sit side by side. Nodes are drawn up front
// and "activate" as run status streams in.
const INPUT_NODE_ID = "__input__";

// Layout constants.
const NODE_X = 0;
const NODE_GAP = 50;
const ROW_GAP = 40;
const FALLBACK_HEIGHT = 64;
const FALLBACK_WIDTH = 300;
// Shared axis that every row's horizontal center aligns to. The absolute
// value is arbitrary — fitView centers the viewport.
const CENTER_X = NODE_X + 300;

// Shared fit-view tuning: `padding` adds margin around the graph, and
// `maxZoom` caps how far fitView zooms IN (React Flow's default is 2x, which
// makes small graphs start uncomfortably close). Lower maxZoom = starts more
// zoomed out.
const FIT_VIEW_OPTIONS = { padding: 0.3, maxZoom: 0.8 };

const WAITING_STEP: WorkflowStepResult = {
  name: "",
  status: "waiting",
  input: null,
  output: null,
  suspendPayload: null,
  resumePayload: null,
};

type GraphNode = InputNodeType | StepNodeType;

export type WorkflowGraphProps = {
  /** Graph rows (sequential/parallel/conditional) from the Mastra API. */
  rows: WorkflowGraphRow[];
  workflowData: WorkflowData | null;
  /** True when the hook is idle (no run streaming) — gates the input node. */
  isReady: boolean;
  suspendedStep: { stepId: string; payload: Record<string, unknown> } | null;
  /** Input node heading (workflow display name or first field label). */
  inputLabel: string;
  /** Fields parsed from the workflow's input schema. */
  inputFields: WorkflowInputField[];
  inputDescription?: string;
  /**
   * When viewing a historical run: the original input text, shown read-only
   * in the input node instead of the form.
   */
  replayInput?: string | null;
  /** Per-step durations (ms), keyed by step id (historical runs). */
  durations?: Record<string, number>;
  /**
   * Allow dragging nodes around the canvas. Applies to ALL nodes via React
   * Flow's global flag (no per-node hardcoding). Note: the layout effect
   * re-stacks nodes into rows, so dragged positions won't stick while a run
   * is updating. @default false
   */
  nodesDraggable?: boolean;
  /**
   * Custom output rendering per step (from the workflow UI registry).
   * Return undefined to fall back to the raw-JSON default. Steps with custom
   * output start expanded.
   */
  renderStepOutput?: (stepId: string, output: unknown) => ReactNode | undefined;
  /**
   * Render the inline UI for a suspended step (e.g. a generic resume form).
   * Rendered inside the suspended step's node.
   */
  renderSuspended?: (stepId: string, payload: Record<string, unknown>) => ReactNode;
  onSubmit: (values: Record<string, unknown>, label: string) => void;
};

/** Row structure as node-id lists, with the input node as the first row. */
function rowIdsWithInput(rows: WorkflowGraphRow[]): string[][] {
  return [
    [INPUT_NODE_ID],
    ...rows.map((row) => (row.kind === "step" ? [row.step.id] : row.steps.map((s) => s.id))),
  ];
}

function WorkflowGraphInner({
  rows,
  workflowData,
  isReady,
  suspendedStep,
  inputLabel,
  inputFields,
  inputDescription,
  replayInput,
  durations,
  nodesDraggable = false,
  renderStepOutput,
  renderSuspended,
  onSubmit,
}: WorkflowGraphProps) {
  // Per-step expanded overrides. Falls back to a sensible default when unset.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = useCallback((stepId: string, open: boolean) => {
    setExpanded((prev) => ({ ...prev, [stepId]: open }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  // Follow the app's theme (next-themes), NOT the OS: `resolvedTheme` is the
  // mode the app is actually rendering ("system" already resolved). Fall back
  // to dark pre-hydration to match the app's defaultTheme.
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "light" ? "light" : "dark";

  // Flat steps in execution order, and conditional-branch siblings per step
  // (used to derive the client-side "skipped" status).
  const steps = useMemo<WorkflowStepDef[]>(
    () => rows.flatMap((row) => (row.kind === "step" ? [row.step] : row.steps)),
    [rows],
  );
  const conditionalSiblings = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (row.kind !== "conditional") continue;
      for (const step of row.steps) {
        map.set(
          step.id,
          row.steps.filter((s) => s.id !== step.id).map((s) => s.id),
        );
      }
    }
    return map;
  }, [rows]);

  // A conditional branch is "skipped" once a sibling branch has run instead.
  const isSkipped = useCallback(
    (stepId: string): boolean => {
      if (workflowData?.steps[stepId]) return false;
      const siblings = conditionalSiblings.get(stepId);
      return !!siblings?.some((id) => workflowData?.steps[id]);
    },
    [workflowData, conditionalSiblings],
  );

  // Build the static node set (input node + one node per step), overlaying live
  // status from `workflowData` as the run progresses. Existing node objects are
  // spread first so measured dimensions and positions survive the update.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));

      const inputNode: InputNodeType = {
        ...(prevById.get(INPUT_NODE_ID) as InputNodeType | undefined),
        id: INPUT_NODE_ID,
        type: "workflowInput",
        position: prevById.get(INPUT_NODE_ID)?.position ?? { x: NODE_X, y: 0 },
        data: {
          disabled: !isReady,
          label: inputLabel,
          description: inputDescription,
          fields: inputFields,
          staticValue: replayInput ?? undefined,
          onSubmit,
        },
      };

      const stepNodes: StepNodeType[] = steps.map((def, i) => {
        const stepId = def.id;
        const existing = prevById.get(stepId) as StepNodeType | undefined;
        const live = workflowData?.steps[stepId];
        const step: WorkflowStepResult = live ?? {
          ...WAITING_STEP,
          name: stepId,
          status: isSkipped(stepId) ? "skipped" : "waiting",
        };

        const hasOutput = step.status === "success" && step.output != null;
        const outputContent = hasOutput ? renderStepOutput?.(stepId, step.output) : undefined;
        // Steps with custom output rendering start expanded; raw-JSON steps
        // start collapsed. Explicit user toggles always win.
        const isExpanded = stepId in expanded ? expanded[stepId] : outputContent != null;
        const isSuspended = suspendedStep?.stepId === stepId;

        return {
          ...existing,
          id: stepId,
          type: "step",
          // Rough initial placement — the layout effect below immediately
          // re-stacks everything from measured sizes.
          position: existing?.position ?? { x: NODE_X, y: (i + 1) * (FALLBACK_HEIGHT + NODE_GAP) },
          data: {
            step,
            description: def.description,
            durationMs: durations?.[stepId],
            expandable: hasOutput,
            expanded: hasOutput && isExpanded,
            outputContent,
            onToggle: (open: boolean) => toggle(stepId, open),
            suspendContent:
              isSuspended && suspendedStep
                ? renderSuspended?.(stepId, suspendedStep.payload)
                : undefined,
          },
        };
      });

      return [inputNode, ...stepNodes];
    });
  }, [
    steps,
    workflowData,
    isReady,
    isSkipped,
    suspendedStep,
    expanded,
    inputLabel,
    inputFields,
    inputDescription,
    replayInput,
    durations,
    renderStepOutput,
    renderSuspended,
    onSubmit,
    setNodes,
    toggle,
  ]);

  // Edges: every node in a row connects to every node in the next row, which
  // renders fan-out into parallel/conditional rows and fan-in back out of
  // them (single-step rows reduce to a plain chain). All edges use React
  // Flow's animated style; the edge feeding a running step is tinted, and
  // edges into skipped branches are faded.
  useEffect(() => {
    const rowIds = rowIdsWithInput(rows);
    const next: Edge[] = [];
    for (let i = 1; i < rowIds.length; i++) {
      for (const sourceId of rowIds[i - 1]) {
        for (const targetId of rowIds[i]) {
          const running = workflowData?.steps[targetId]?.status === "running";
          const skipped = isSkipped(targetId) || isSkipped(sourceId);
          next.push({
            id: `${sourceId}->${targetId}`,
            source: sourceId,
            target: targetId,
            animated: !skipped,
            style: running
              ? // Matches the running status icon (text-blue-500).
                { stroke: "var(--color-blue-500)" }
              : skipped
                ? { opacity: 0.35 }
                : undefined,
          } satisfies Edge);
        }
      }
    }
    setEdges(next);
  }, [rows, workflowData, isSkipped, setEdges]);

  // Layout: stack rows vertically; within a row, place nodes side by side and
  // center the row on a shared axis.
  // - y: each row sits below the previous row's tallest measured node + gap,
  //   so expanding a node pushes later rows down (and collapse pulls up).
  // - x: nodes in a row are laid out left-to-right from the row's centered
  //   total width, keeping differently-sized rows centered on the chain.
  // Only writes when a position actually changes, so it settles after
  // measurements arrive rather than looping.
  useEffect(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const positions = new Map<string, { x: number; y: number }>();

    let y = 0;
    for (const ids of rowIdsWithInput(rows)) {
      const rowNodes = ids.map((id) => byId.get(id)).filter((n): n is GraphNode => n !== undefined);
      if (rowNodes.length === 0) continue;

      const widths = rowNodes.map((n) => n.measured?.width ?? FALLBACK_WIDTH);
      const totalWidth = widths.reduce((sum, w) => sum + w, 0) + ROW_GAP * (rowNodes.length - 1);

      let x = CENTER_X - totalWidth / 2;
      let rowHeight = 0;
      rowNodes.forEach((node, i) => {
        positions.set(node.id, { x, y });
        x += widths[i] + ROW_GAP;
        rowHeight = Math.max(rowHeight, node.measured?.height ?? FALLBACK_HEIGHT);
      });
      y += rowHeight + NODE_GAP;
    }

    let changed = false;
    const next = nodes.map((n) => {
      const position = positions.get(n.id);
      if (!position) return n;
      if (n.position.x !== position.x || n.position.y !== position.y) {
        changed = true;
        return { ...n, position };
      }
      return n;
    });
    if (changed) setNodes(next as GraphNode[]);
  }, [nodes, rows, setNodes]);

  // Refit whenever the node count changes (e.g. steps arrive from the API),
  // after the new nodes are created and measured.
  const fittedCount = useRef(0);
  useEffect(() => {
    if (nodes.length === 0 || nodes.length === fittedCount.current) return;
    fittedCount.current = nodes.length;
    const raf = requestAnimationFrame(() => fitView({ ...FIT_VIEW_OPTIONS, duration: 200 }));
    return () => cancelAnimationFrame(raf);
  }, [nodes.length, fitView]);

  return (
    <ReactFlow<GraphNode, Edge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      colorMode={colorMode}
      nodesDraggable={nodesDraggable}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} />
      <Controls showInteractive={true} />
    </ReactFlow>
  );
}

export function WorkflowGraph(props: WorkflowGraphProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
