import type { LucideIcon } from "lucide-react";
import { ArrowRight, GitBranch, MapPin } from "lucide-react";
import Link from "next/link";

type WorkflowCard = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  tags: string[];
};

const workflows: WorkflowCard[] = [
  {
    id: "weather-workflow",
    name: "Activity Planner",
    description:
      "Get a weather-aware activity plan for any city. Resolves locations, fetches forecasts, and suggests morning, afternoon, and indoor activities.",
    icon: MapPin,
    href: "/workflows/weather-workflow",
    tags: ["Weather", "Activities", "Planning"],
  },
  {
    id: "demo-workflow",
    name: "Control-Flow Demo",
    description:
      "Test workflow exercising parallel fan-out, conditional branching, and a human-review suspend step. No LLM calls — useful for checking graph rendering.",
    icon: GitBranch,
    href: "/workflows/demo-workflow",
    tags: ["Parallel", "Branch", "Suspend"],
  },
];

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">Workflows</h1>
        <p className="text-muted-foreground text-sm">
          Multi-step AI workflows that combine agents, tools, and human input.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Link
            key={workflow.id}
            href={workflow.href}
            className="border-border hover:border-foreground/20 group flex flex-col rounded-lg border p-6 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <workflow.icon className="text-foreground size-5" strokeWidth={1.5} />
              </div>
              <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <h2 className="font-medium">{workflow.name}</h2>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {workflow.description}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {workflow.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
