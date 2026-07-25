"use client";

import { formatDistanceToNow } from "date-fns";
import { CircleStop, Loader2, MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type * as React from "react";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import type { WorkflowRunSummary } from "../hooks/use-workflow-runs";
import { formatDuration } from "../lib/step-status";

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

/**
 * Run metadata shown in the options menu rather than on the row itself, so the
 * list stays a clean single line per run. Empty when nothing is known.
 */
function runMeta(run: WorkflowRunSummary): string {
  const parts = [runTimeAgo(run)];
  if (run.durationMs !== null) parts.push(formatDuration(run.durationMs));
  return parts.filter(Boolean).join(" · ");
}

/** Run statuses that can still be stopped/canceled. */
const STOPPABLE_STATUSES = new Set(["running", "pending", "suspended"]);

/**
 * Run statuses that are still in flight. Deliberately separate from
 * `STOPPABLE_STATUSES` — "is it working?" and "can I stop it?" are different
 * questions that happen to have the same answer today.
 */
const ACTIVE_STATUSES = new Set(["running", "pending", "suspended"]);

/**
 * Trailing run indicator: a spinner while a run is in flight, a small red dot
 * when it failed, and nothing at all otherwise (including success).
 */
function RunIndicator({ status }: { status: string }) {
  if (ACTIVE_STATUSES.has(status)) {
    return (
      <>
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">In progress</span>
      </>
    );
  }
  if (status === "failed") {
    return (
      <>
        <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-hidden />
        <span className="sr-only">Failed</span>
      </>
    );
  }
  return null;
}

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
      <SidebarHeader className="px-4 pt-3 pb-0">
        <span className="text-lg tracking-tight">{title}</span>
      </SidebarHeader>

      {/* Padding stacks: content + group + button. Keeping it at 4/4/8 lands
          row text at 16px, matching the header's px-4. */}
      <SidebarContent className="px-1 pt-1">
        <SidebarGroup className="p-1">
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

        <SidebarGroup className="p-1">
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
                  const meta = runMeta(run);
                  return (
                    <SidebarMenuItem key={run.runId} className="my-0.5">
                      <SidebarMenuButton
                        onClick={() => onSelectRun(run.runId)}
                        isActive={run.runId === selectedRunId}
                        className="h-auto py-2 pr-7"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm capitalize">
                          {runLabel(run)}
                        </span>
                        <RunIndicator status={run.status} />
                      </SidebarMenuButton>
                      <DropdownMenu>
                        {/* Always visible, ghost styling: no hover background,
                            just a foreground shift. Vertically centered — the
                            peer-variant `top` must be overridden too, since the
                            default is pinned near the top for fixed-height rows. */}
                        <SidebarMenuAction
                          render={<DropdownMenuTrigger />}
                          className="top-1/2 -translate-y-1/2 text-muted-foreground peer-data-[size=default]/menu-button:top-1/2 hover:bg-transparent hover:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground"
                        >
                          <MoreHorizontalIcon className="size-3.5" />
                          <span className="sr-only">Run options</span>
                        </SidebarMenuAction>
                        <DropdownMenuContent
                          side="bottom"
                          align="start"
                          className="min-w-44 rounded-lg"
                        >
                          {meta && (
                            <>
                              {/* Base UI requires GroupLabel to sit inside a Group. */}
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="font-normal">
                                  {meta}
                                </DropdownMenuLabel>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                            </>
                          )}
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
