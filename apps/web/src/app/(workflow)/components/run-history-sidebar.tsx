"use client";

import { formatDistanceToNow } from "date-fns";
import { CircleStop, MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { formatDuration, runStatusConfig } from "../lib/step-status";
import type { WorkflowRunSummary } from "../lib/use-workflow-runs";

/** Best-effort human label for a run: its first string input value. */
function runLabel(run: WorkflowRunSummary): string {
  const firstString = Object.values(run.input ?? {}).find(
    (v): v is string => typeof v === "string" && v.trim() !== "",
  );
  return firstString ?? run.runId.slice(0, 8);
}

function runTimeAgo(run: WorkflowRunSummary): string {
  const date = new Date(run.createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Run statuses that can still be stopped/canceled. */
const STOPPABLE_STATUSES = new Set(["running", "pending", "suspended"]);

/**
 * Run-history sidebar shared by workflow pages: a "New run" action plus the
 * user's recent runs for one workflow. Purely presentational — fetch runs with
 * `useMastraWorkflowRuns` and control selection from the page.
 */
export function RunHistorySidebar({
  title,
  runs,
  isLoading,
  selectedRunId,
  onSelectRun,
  onStopRun,
  onDeleteRun,
  emptyMessage = "No runs yet.",
  className,
  ...props
}: {
  /** Sidebar heading (typically the workflow's display name). */
  title: string;
  runs: WorkflowRunSummary[];
  isLoading: boolean;
  /** Currently viewed historical run, or null when live. */
  selectedRunId: string | null;
  /** Called with a run id to view it, or null for a new/live run. */
  onSelectRun: (runId: string | null) => void;
  /** Stop/cancel an in-flight run (shown for running/pending/suspended runs). */
  onStopRun: (runId: string) => void;
  /** Permanently delete a run. */
  onDeleteRun: (runId: string) => void;
  /** Shown when the user has no runs yet. */
  emptyMessage?: string;
} & React.ComponentProps<typeof Sidebar>) {
  return (
    // `bg-sidebar` resolves the --sidebar token; remap it to the app's
    // --background so the sidebar matches the node canvas instead of clashing.
    <Sidebar className={cn("[--sidebar:var(--background)]", className)} {...props}>
      <SidebarHeader className="px-4 pt-4 pb-0">
        <span className="text-lg tracking-tight">{title}</span>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSelectRun(null)}
                  isActive={selectedRunId === null}
                >
                  <PlusIcon className="size-4" />
                  <span>New run</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent runs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading && runs.length === 0 ? (
                Array.from({ length: 5 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton with fixed length, never reordered
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))
              ) : runs.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyMessage}</p>
              ) : (
                runs.map((run) => {
                  const cfg = runStatusConfig(run.status);
                  const Icon = cfg.icon;
                  return (
                    <SidebarMenuItem key={run.runId} className="my-1.5">
                      <SidebarMenuButton
                        onClick={() => onSelectRun(run.runId)}
                        isActive={run.runId === selectedRunId}
                        className="h-auto py-2 pr-7"
                      >
                        <Icon
                          className={`size-4 shrink-0 ${cfg.color} ${cfg.spin ? "animate-spin" : ""}`}
                        />
                        <div className="grid min-w-0 flex-1 leading-tight">
                          <span className="truncate text-sm capitalize">{runLabel(run)}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {runTimeAgo(run)}
                            {run.durationMs !== null && ` · ${formatDuration(run.durationMs)}`}
                          </span>
                        </div>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <SidebarMenuAction showOnHover render={<DropdownMenuTrigger />}>
                          <MoreHorizontalIcon className="size-3.5" />
                          <span className="sr-only">Run options</span>
                        </SidebarMenuAction>
                        <DropdownMenuContent
                          side="bottom"
                          align="start"
                          className="min-w-36 rounded-lg"
                        >
                          {STOPPABLE_STATUSES.has(run.status) && (
                            <DropdownMenuItem onClick={() => onStopRun(run.runId)}>
                              <CircleStop className="mr-2 size-4" />
                              Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDeleteRun(run.runId)}
                          >
                            <Trash2Icon className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
      <SidebarFooter className="border-t">
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
