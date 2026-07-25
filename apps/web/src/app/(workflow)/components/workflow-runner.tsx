"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getAuthToken } from "@/hooks/use-auth-token";
import { authClient } from "@/lib/auth-client";
import { useMastraWorkflow } from "../hooks/use-workflow";
import { useMastraWorkflowDefinition } from "../hooks/use-workflow-definition";
import {
  useMastraWorkflowRuns,
  workflowRunDurations,
  workflowRunToWorkflowData,
} from "../hooks/use-workflow-runs";
import type { CanvasConfig } from "../lib/graph-config";
import { RunHistorySidebar } from "./run-history-sidebar";
import { SuspendForm } from "./suspend-form";
import { WorkflowGraph } from "./workflow-graph";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

export type WorkflowRunnerProps = {
  workflowId: string;
  name: string;
  /** Canvas sizing/spacing. Declared in full by every workflow page. */
  canvas: CanvasConfig;
  /** Heading shown on the input node. @default "Input" */
  inputLabel?: string;
  inputDescription?: string;
  /** Input node width in px. Falls back to `canvas.nodeWidth`. */
  inputWidth?: number;
  emptyMessage?: string;
  renderInput?: (props: WorkflowInputRenderProps) => ReactNode;
  renderStep?: (stepId: string, output: unknown) => ReactNode | undefined;
  /** Per-step node width in px, keyed by step id. Falls back to `canvas.nodeWidth`. */
  stepWidths?: Record<string, number>;
};

/**
 * The static half of a workflow page — everything except the render functions.
 * Each `workflows/<id>/config.ts` satisfies this, so omitting a required field
 * (notably `canvas`) fails the build.
 */
export type WorkflowPageData = Omit<WorkflowRunnerProps, "renderInput" | "renderStep">;

export type WorkflowInputRenderProps = {
  disabled: boolean;
  onSubmit: (values: Record<string, unknown>, label: string) => void;
};

export function WorkflowRunner(props: WorkflowRunnerProps) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userId = session?.user?.id ?? "authenticated-user";
  return <WorkflowRun key={`${props.workflowId}:${userId}`} {...props} userId={userId} />;
}

function WorkflowRun({
  workflowId,
  name,
  canvas,
  inputLabel = "Input",
  inputDescription,
  inputWidth,
  emptyMessage,
  renderInput,
  renderStep,
  stepWidths,
  userId,
}: WorkflowRunnerProps & { userId: string }) {
  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = await getAuthToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      // The API call will surface the authentication failure to the workflow hooks.
      return {};
    }
  }, []);

  const {
    definition,
    rows,
    steps,
    inputFields,
    error: definitionError,
  } = useMastraWorkflowDefinition({
    baseUrl: MASTRA_BASE_URL,
    workflowId,
    headers: getHeaders,
  });

  const { status, stop, sendInput, resume, workflowData, runId, suspendedStep } = useMastraWorkflow(
    {
      baseUrl: MASTRA_BASE_URL,
      workflowId,
      resourceId: userId,
      headers: getHeaders,
    },
  );

  const {
    runs,
    isLoading: runsLoading,
    refresh,
    deleteRun,
    cancelRun,
  } = useMastraWorkflowRuns({
    baseUrl: MASTRA_BASE_URL,
    workflowId,
    resourceId: userId,
    headers: getHeaders,
  });

  // Mastra persists a snapshot when a run starts, so refresh both when the
  // stream starts and when it finishes to keep the history controls current.
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    if (was !== status && (status === "streaming" || was === "streaming")) refresh();
    prevStatus.current = status;
  }, [status, refresh]);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = useMemo(
    () => runs.find((run) => run.runId === selectedRunId) ?? null,
    [runs, selectedRunId],
  );
  const replayData = useMemo(
    () => (selectedRun ? workflowRunToWorkflowData(selectedRun) : null),
    [selectedRun],
  );
  const replayDurations = useMemo(
    () => (selectedRun ? workflowRunDurations(selectedRun) : undefined),
    [selectedRun],
  );
  const replayInput = selectedRun?.input ?? undefined;

  const renderSuspended = useCallback(
    (stepId: string, payload: Record<string, unknown>) => (
      <SuspendForm
        payload={payload}
        resumeFields={steps.find((step) => step.id === stepId)?.resumeFields}
        onResume={(data, label) => resume(runId, stepId, data, label)}
      />
    ),
    [steps, resume, runId],
  );

  const handleSubmit = useCallback(
    (values: Record<string, unknown>, label: string) => {
      setSelectedRunId(null);
      sendInput(values, label);
    },
    [sendInput],
  );

  const handleDeleteRun = useCallback(
    (deletedRunId: string) => {
      setSelectedRunId((current) => (current === deletedRunId ? null : current));
      deleteRun(deletedRunId).catch(() => toast.error("Failed to delete run"));
    },
    [deleteRun],
  );

  const handleStopRun = useCallback(
    (stoppedRunId: string) => {
      // Canceling server-side only marks the run; the browser keeps consuming
      // the stream it already opened. Abort it too when the run being stopped
      // is the one currently streaming, or the graph keeps animating.
      if (stoppedRunId === runId) stop();
      cancelRun(stoppedRunId).catch(() => toast.error("Failed to stop run"));
    },
    [cancelRun, runId, stop],
  );

  const isReplay = selectedRun !== null;
  const isInputReady = !isReplay && status === "ready";
  const resolvedInputDescription = inputDescription ?? definition?.description;
  const inputContent = renderInput?.({
    disabled: !isInputReady,
    onSubmit: handleSubmit,
  });

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <RunHistorySidebar
          title={name}
          runs={runs}
          isLoading={runsLoading}
          selectedRunId={selectedRunId}
          onSelectRun={setSelectedRunId}
          onStopRun={handleStopRun}
          onDeleteRun={handleDeleteRun}
          emptyMessage={emptyMessage ?? "No runs yet. Fill in the input to start one."}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link href="/workflows" />}>Workflows</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {/* This route group has no NavBar, so the theme toggle and site
                nav live here — the hamburger shows at all sizes since there
                is no desktop nav to fall back on. */}
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
              <MobileNav />
            </div>
          </header>

          <div className="min-h-0 flex-1">
            {definitionError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                <CircleAlert className="size-5 text-destructive" />
                <p className="text-sm font-medium">Failed to load workflow "{workflowId}"</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {definitionError.message}. Check that the workflow is registered on the Mastra
                  server.
                </p>
              </div>
            ) : (
              <WorkflowGraph
                rows={rows}
                workflowData={isReplay ? replayData : workflowData}
                canvas={canvas}
                suspendedStep={isReplay ? null : suspendedStep}
                inputLabel={inputLabel}
                inputFields={inputFields}
                inputDescription={resolvedInputDescription}
                inputWidth={inputWidth}
                inputContent={inputContent}
                replayInput={replayInput}
                durations={replayDurations}
                stepWidths={stepWidths}
                renderStepOutput={renderStep}
                renderSuspended={renderSuspended}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
