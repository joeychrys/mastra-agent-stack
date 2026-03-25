import type { LucideIcon } from "lucide-react";
import { ArrowRight, CloudSun } from "lucide-react";
import Link from "next/link";

type AgentCard = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  tags: string[];
};

const agents: AgentCard[] = [
  {
    id: "weather-agent",
    name: "Weather Assistant",
    description:
      "Get current weather conditions, forecasts, and climate data for any location worldwide.",
    icon: CloudSun,
    href: "/chat",
    tags: ["Weather", "Forecasts"],
  },
];

export default function AgentsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 space-y-2">
        <h1 className="text-2xl font-medium tracking-tight">Agents</h1>
        <p className="text-muted-foreground text-sm">
          Choose an AI assistant to start a conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={agent.href}
            className="border-border hover:border-foreground/20 group flex flex-col rounded-lg border p-6 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                <agent.icon className="text-foreground size-5" strokeWidth={1.5} />
              </div>
              <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-4">
              <h2 className="font-medium">{agent.name}</h2>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {agent.description}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {agent.tags.map((tag) => (
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
