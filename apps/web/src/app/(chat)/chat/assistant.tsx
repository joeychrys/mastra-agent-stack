"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraThreadListRuntime } from "@repo/aui-mastra";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Thread } from "./components/assistant-ui/thread";
import { ThreadListSidebar } from "./components/assistant-ui/threadlist-sidebar";
import { WeatherToolUI } from "./components/tools/weather-tool-ui";
import { getAuthToken } from "./hooks/use-auth-token";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";
const AGENT_ID = "weatherAgent";
const RESOURCE_ID = "authenticated-user";

export const Assistant = () => {
  const runtime = useMastraThreadListRuntime({
    baseUrl: MASTRA_BASE_URL,
    agentId: AGENT_ID,
    resourceId: RESOURCE_ID,
    headers: async () => {
      const token = await getAuthToken();
      return { Authorization: `Bearer ${token}` };
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
              <h1 className="text-lg font-medium tracking-tight">Chat</h1>
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
