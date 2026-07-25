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
import type {
  WorkflowGraphRow,
  WorkflowInputField,
  WorkflowStepDef,
} from "../hooks/use-workflow-definition";
import {
  type CanvasConfig,
  CENTER_X,
  FALLBACK_NODE_HEIGHT,
  INPUT_NODE_ID,
} from "../lib/graph-config";
import type { WorkflowData, WorkflowStepResult } from "../lib/types";
import { InputNode, type InputNodeType } from "./input-node";
import { StepNode, type StepNodeType } from "./step-node";

// Register node types once at module scope so React Flow doesn't warn about
// re-created objects on every render.
const nodeTypes = { workflowInput: InputNode, step: StepNode };

// The graph structure is fetched from the Mastra API (workflow `stepGraph`)
// and passed in as rows: sequential steps stack vertically, while parallel and
// conditional steps within a row sit side by side. Nodes are drawn up front
// and "activate" as run status streams in. All spacing and sizing comes from
// the page's `canvas` config — there are no layout constants here.

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
  /** Canvas sizing/spacing declared by the workflow page. */
  canvas: CanvasConfig;
  suspendedStep: { stepId: string; payload: Record<string, unknown> } | null;
  /** Input node heading (workflow display name or first field label). */
  inputLabel: string;
  inputFields: WorkflowInputField[];
  inputDescription?: string;
  /** Input node width in px. Falls back to `canvas.nodeWidth`. */
  inputWidth?: number;
  /** Page-owned input content rendered inside the graph node shell. */
  inputContent?: ReactNode;
  /** Original input shown when replaying a historical run. */
  replayInput?: Record<string, unknown>;
  /** Per-step durations (ms), keyed by step id (historical runs). */
  durations?: Record<string, number>;
  /** Per-step node width in px, keyed by step id. Falls back to `canvas.nodeWidth`. */
  stepWidths?: Record<string, number>;
  /**
   * Custom output rendering declared by the workflow page.
   * Return undefined to fall back to the raw-JSON default. Steps with custom
   * output start expanded.
   */
  renderStepOutput?: (stepId: string, output: unknown) => ReactNode | undefined;
  /**
   * Render the inline UI for a suspended step (e.g. a generic resume form).
   * Rendered inside the suspended step's node.
   */
  renderSuspended?: (stepId: string, payload: Record<string, unknown>) => ReactNode;
};

/** Row structure as node-id lists, with input first. */
function graphRowIds(rows: WorkflowGraphRow[]): string[][] {
  return [
    [INPUT_NODE_ID],
    ...rows.map((row) => (row.kind === "step" ? [row.step.id] : row.steps.map((step) => step.id))),
  ];
}

function WorkflowGraphInner({
  rows,
  workflowData,
  canvas,
  suspendedStep,
  inputLabel,
  inputFields,
  inputDescription,
  inputWidth,
  inputContent,
  replayInput,
  durations,
  stepWidths,
  renderStepOutput,
  renderSuspended,
}: WorkflowGraphProps) {
  // Per-step expanded overrides. Falls back to a sensible default when unset.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = useCallback((stepId: string, open: boolean) => {
    setExpanded((prev) => ({ ...prev, [stepId]: open }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  const fitViewOptions = useMemo(
    () => ({ padding: canvas.fitViewPadding, maxZoom: canvas.fitViewMaxZoom }),
    [canvas.fitViewPadding, canvas.fitViewMaxZoom],
  );

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
        selectable: false,
        position: prevById.get(INPUT_NODE_ID)?.position ?? { x: 0, y: 0 },
        data: {
          label: inputLabel,
          description: inputDescription,
          width: inputWidth ?? canvas.nodeWidth,
          content: inputContent,
          fields: inputFields,
          replayValue: replayInput,
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
        const isExpanded = stepId in expanded ? expanded[stepId] : outputContent != null;
        const isSuspended = suspendedStep?.stepId === stepId;

        return {
          ...existing,
          id: stepId,
          type: "step",
          // Rough initial placement — the layout effect below immediately
          // re-stacks everything from measured sizes.
          position: existing?.position ?? {
            x: 0,
            y: (i + 1) * (FALLBACK_NODE_HEIGHT + canvas.rowSpacingY),
          },
          data: {
            step,
            description: def.description,
            durationMs: durations?.[stepId],
            width: stepWidths?.[stepId] ?? canvas.nodeWidth,
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
    canvas.nodeWidth,
    canvas.rowSpacingY,
    isSkipped,
    suspendedStep,
    expanded,
    inputLabel,
    inputFields,
    inputDescription,
    inputWidth,
    inputContent,
    replayInput,
    durations,
    stepWidths,
    renderStepOutput,
    renderSuspended,
    setNodes,
    toggle,
  ]);

  // Edges: every node in a row connects to every node in the next row, which
  // renders fan-out into parallel/conditional rows and fan-in back out of
  // them (single-step rows reduce to a plain chain). All edges use React
  // Flow's animated style; the edge feeding a running step is tinted, and
  // edges into skipped branches are faded.
  useEffect(() => {
    const rowIds = graphRowIds(rows);
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
    for (const ids of graphRowIds(rows)) {
      const rowNodes = ids.map((id) => byId.get(id)).filter((n): n is GraphNode => n !== undefined);
      if (rowNodes.length === 0) continue;

      // Before React Flow measures a node, fall back to the width it was told
      // to render at rather than a global guess.
      const widths = rowNodes.map((n) => n.measured?.width ?? n.data.width);
      const totalWidth =
        widths.reduce((sum, w) => sum + w, 0) + canvas.nodeSpacingX * (rowNodes.length - 1);

      let x = CENTER_X - totalWidth / 2;
      let rowHeight = 0;
      rowNodes.forEach((node, i) => {
        positions.set(node.id, { x, y });
        x += widths[i] + canvas.nodeSpacingX;
        rowHeight = Math.max(rowHeight, node.measured?.height ?? FALLBACK_NODE_HEIGHT);
      });
      y += rowHeight + canvas.rowSpacingY;
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
  }, [nodes, rows, canvas.nodeSpacingX, canvas.rowSpacingY, setNodes]);

  // Refit whenever the node count changes (e.g. steps arrive from the API),
  // after the new nodes are created and measured.
  const fittedCount = useRef(0);
  useEffect(() => {
    if (nodes.length === 0 || nodes.length === fittedCount.current) return;
    fittedCount.current = nodes.length;
    const raf = requestAnimationFrame(() => fitView({ ...fitViewOptions, duration: 200 }));
    return () => cancelAnimationFrame(raf);
  }, [nodes.length, fitView, fitViewOptions]);

  return (
    <ReactFlow<GraphNode, Edge>
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      colorMode={colorMode}
      nodesDraggable={canvas.nodesDraggable}
      nodesConnectable={false}
      elementsSelectable={true}
      fitView
      fitViewOptions={fitViewOptions}
      minZoom={canvas.minZoom}
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
