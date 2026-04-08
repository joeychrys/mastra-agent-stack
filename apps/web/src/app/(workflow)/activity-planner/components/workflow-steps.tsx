"use client";

import type { WorkflowData, WorkflowStepStatus } from "@repo/aui-mastra";
import { CheckCircle2, ChevronRight, Circle, Loader2 } from "lucide-react";
import { type FC, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ActivityCard } from "./activity-card";

const statusConfig: Record<
  WorkflowStepStatus,
  { icon: FC<{ className?: string }>; color: string }
> = {
  running: {
    icon: ({ className }) => <Loader2 className={`${className} animate-spin`} />,
    color: "text-blue-500",
  },
  success: {
    icon: ({ className }) => <CheckCircle2 className={className} />,
    color: "text-emerald-500",
  },
  failed: {
    icon: ({ className }) => <Circle className={className} />,
    color: "text-red-500",
  },
  suspended: {
    icon: ({ className }) => <Circle className={className} />,
    color: "text-amber-500",
  },
  waiting: {
    icon: ({ className }) => <Circle className={className} />,
    color: "text-muted-foreground/40",
  },
};

function formatStepName(name: string): string {
  return name.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const EXPANDED_STEPS = new Set(["plan-activities"]);

export function WorkflowSteps({ data }: { data: WorkflowData }) {
  const steps = Object.entries(data.steps);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const toggle = (stepId: string, open: boolean) => {
    setOverrides((prev) => ({ ...prev, [stepId]: open }));
  };

  return (
    <div className="mt-2">
      {steps.map(([stepId, step], i) => {
        const cfg = statusConfig[step.status] ?? statusConfig.waiting;
        const Icon = cfg.icon;
        const isLast = i === steps.length - 1;
        const hasOutput = step.status === "success" && step.output != null;
        const expandByDefault = EXPANDED_STEPS.has(step.name);
        const isOpen = stepId in overrides ? overrides[stepId] : hasOutput && expandByDefault;

        return (
          <div key={stepId} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-5 shrink-0 items-center justify-center">
                <Icon className={`size-4 ${cfg.color}`} />
              </div>
              {!isLast && <div className="w-px flex-1 border-l border-dashed border-border" />}
            </div>

            <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
              {hasOutput ? (
                <Collapsible open={isOpen} onOpenChange={(open) => toggle(stepId, open)}>
                  <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between">
                    <span className="text-sm">{formatStepName(step.name)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs capitalize ${cfg.color}`}>{step.status}</span>
                      <ChevronRight className="text-muted-foreground size-3.5 transition-transform group-data-[panel-open]:rotate-90" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    {expandByDefault ? (
                      <ActivityCard data={step.output} />
                    ) : (
                      <pre className="text-muted-foreground overflow-auto rounded-2xl bg-muted px-4 py-3 text-xs leading-relaxed">
                        {typeof step.output === "string"
                          ? step.output
                          : JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{formatStepName(step.name)}</span>
                  <span className={`text-xs capitalize ${cfg.color}`}>{step.status}</span>
                </div>
              )}

              {step.status === "failed" && (
                <p className="text-destructive mt-1 text-xs">Step failed</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
