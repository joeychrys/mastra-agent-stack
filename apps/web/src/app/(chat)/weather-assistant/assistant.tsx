"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraThreadListRuntime } from "@repo/aui-mastra";
import Link from "next/link";
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
import { Thread } from "../components/assistant-ui/thread";
import { ThreadListSidebar } from "../components/assistant-ui/threadlist-sidebar";
import { WeatherToolUI } from "./components/tools/weather-tool-ui";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";
// Always the agent's `id` (as listed by GET /api/agents) — never the Mastra
// registration map key (e.g. "weatherAgent"), which also resolves but drifts.
const AGENT_ID = "weather-agent";
const RESOURCE_ID = "authenticated-user";

export const Assistant = () => {
  const runtime = useMastraThreadListRuntime({
    baseUrl: MASTRA_BASE_URL,
    agentId: AGENT_ID,
    resourceId: RESOURCE_ID,
    headers: async (): Promise<Record<string, string>> => {
      try {
        const token = await getAuthToken();
        return { Authorization: `Bearer ${token}` };
      } catch {
        return {};
      }
    },
    titleAgent: {
      enabled: true,
      agentId: "summarizer-agent",
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <WeatherToolUI />
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink render={<Link href="/agents" />}>Agents</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Weather Assistant</BreadcrumbPage>
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
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
