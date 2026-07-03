"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { RunHistorySidebar } from "../../components/run-history-sidebar";
import { SuspendForm } from "../../components/suspend-form";
import { WorkflowGraph } from "../../components/workflow-graph";
import { formatStepName } from "../../lib/step-status";
import { useMastraWorkflow } from "../../lib/use-workflow";
import { useMastraWorkflowDefinition } from "../../lib/use-workflow-definition";
import {
  useMastraWorkflowRuns,
  workflowRunDurations,
  workflowRunToWorkflowData,
} from "../../lib/use-workflow-runs";
import { getWorkflowUI } from "../../lib/workflow-ui";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

// Generic workflow page: everything derives from the workflow id in the URL.
// Structure comes from the Mastra API (`stepGraph` + schemas); optional
// presentation polish comes from the workflow UI registry.
export default function WorkflowPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = use(params);

  // Resolve the session before mounting the runner so runs are tagged and
  // filtered by the real user id (the same id the JWT carries in prod).
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userId = session?.user?.id ?? "authenticated-user";
  return <WorkflowRunner key={`${workflowId}:${userId}`} workflowId={workflowId} userId={userId} />;
}

function WorkflowRunner({ workflowId, userId }: { workflowId: string; userId: string }) {
  const ui = getWorkflowUI(workflowId);

  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const token = await getAuthToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      // Prevent unhandled rejection — the API call will fail with 401
      // and the hook will surface the error via `status` / `error`.
      return {};
    }
  }, []);

  // Static workflow structure (ordered steps + descriptions + schemas)
  // straight from the Mastra API — the graph is built dynamically from this.
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

  const displayName =
    ui.displayName ?? formatStepName(definition?.name ?? workflowId).replace(/ workflow$/i, "");

  const { status, sendInput, resume, workflowData, runId, suspendedStep } = useMastraWorkflow({
    baseUrl: MASTRA_BASE_URL,
    workflowId,
    resourceId: userId,
    headers: getHeaders,
  });

  // Run history, scoped server-side to this user.
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

  // Refresh the history when a live run starts or finishes: Mastra persists
  // the run snapshot at start, so refreshing on stream start makes the
  // in-flight run appear in the sidebar (where it can be stopped).
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    if (was !== status && (status === "streaming" || was === "streaming")) refresh();
    prevStatus.current = status;
  }, [status, refresh]);

  // Replay: when a historical run is selected, hydrate the graph from its
  // stored snapshot instead of the live stream.
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const selectedRun = useMemo(
    () => runs.find((r) => r.runId === selectedRunId) ?? null,
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
  const replayInput = useMemo(() => {
    if (!selectedRun) return null;
    const firstString = Object.values(selectedRun.input ?? {}).find(
      (v): v is string => typeof v === "string" && v.trim() !== "",
    );
    return firstString ?? selectedRun.runId.slice(0, 8);
  }, [selectedRun]);

  // Generic suspend UI: option buttons when the suspend payload carries
  // `options`, otherwise a form derived from the step's `resumeSchema`.
  const renderSuspended = useCallback(
    (stepId: string, payload: Record<string, unknown>) => (
      <SuspendForm
        payload={payload}
        resumeFields={steps.find((s) => s.id === stepId)?.resumeFields}
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
      // Leave replay mode if the viewed run is being deleted.
      setSelectedRunId((current) => (current === deletedRunId ? null : current));
      deleteRun(deletedRunId).catch(() => toast.error("Failed to delete run"));
    },
    [deleteRun],
  );

  const handleStopRun = useCallback(
    (stoppedRunId: string) => {
      cancelRun(stoppedRunId).catch(() => toast.error("Failed to stop run"));
    },
    [cancelRun],
  );

  const isReplay = selectedRun !== null;
  const inputLabel =
    inputFields.length === 1 ? formatStepName(inputFields[0].name) : displayName || "Input";

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <RunHistorySidebar
          title={displayName}
          runs={runs}
          isLoading={runsLoading}
          selectedRunId={selectedRunId}
          onSelectRun={setSelectedRunId}
          onStopRun={handleStopRun}
          onDeleteRun={handleDeleteRun}
          emptyMessage={ui.emptyMessage ?? "No runs yet. Fill in the input to start one."}
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
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
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
                isReady={!isReplay && status === "ready"}
                suspendedStep={isReplay ? null : suspendedStep}
                inputLabel={inputLabel}
                inputFields={inputFields}
                inputDescription={
                  ui.inputDescription ?? definition?.description ?? inputFields[0]?.description
                }
                replayInput={replayInput}
                durations={replayDurations}
                renderStepOutput={ui.renderStepOutput}
                renderSuspended={renderSuspended}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
