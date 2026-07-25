import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleOff,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowStepStatus } from "./types";

// ---------------------------------------------------------------------------
// Shared status config — single source of truth for step status icon/color in
// the workflow graph. The run history sidebar deliberately does NOT use this:
// it shows only an in-flight spinner and a failed dot.
// ---------------------------------------------------------------------------

type StatusConfig = {
  icon: LucideIcon;
  /** Whether the icon should spin (running state). */
  spin?: boolean;
  color: string;
  label: string;
};

export const statusConfig: Record<WorkflowStepStatus, StatusConfig> = {
  running: { icon: Loader2, spin: true, color: "text-blue-500", label: "Running" },
  success: { icon: CheckCircle2, color: "text-emerald-500", label: "Success" },
  failed: { icon: CircleAlert, color: "text-red-500", label: "Failed" },
  suspended: { icon: Circle, color: "text-amber-500", label: "Suspended" },
  waiting: { icon: Circle, color: "text-muted-foreground/40", label: "Waiting" },
  skipped: { icon: CircleOff, color: "text-muted-foreground/40", label: "Skipped" },
};

/** Turn a kebab/snake resource id into a human-readable title. */
export function formatStepName(name: string): string {
  return name.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Format a millisecond duration for display (e.g. "480ms", "3.2s", "1m 12s"). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}
