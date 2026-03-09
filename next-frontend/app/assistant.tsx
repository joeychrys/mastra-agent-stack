"use client";

import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  unstable_useRemoteThreadListRuntime,
  useAuiState,
} from "@assistant-ui/react";
import { AssistantChatTransport, useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { WeatherToolUI } from "@/components/assistant-ui/weather-tool-ui";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createMastraHistoryAdapter, createMastraThreadAdapter } from "@/lib/mastra-thread-adapter";

const MASTRA_CHAT_URL = "http://localhost:4111/chat/weatherAgent";
const RESOURCE_ID = "weather-agent";

function useMastraChatThreadRuntime() {
  const threadId = useAuiState((s) => s.threadListItem.id);

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: MASTRA_CHAT_URL,
        prepareSendMessagesRequest: async (options) => {
          return {
            ...options,
            body: {
              ...options.body,
              id: options.id,
              messages: options.messages,
              trigger: options.trigger,
              messageId: options.messageId,
              metadata: options.requestMetadata,
              memory: {
                thread: threadId,
                resource: RESOURCE_ID,
              },
            },
          };
        },
      }),
    [threadId],
  );

  const chat = useChat({
    id: threadId,
    transport,
  });

  const historyAdapter = useMemo(() => createMastraHistoryAdapter(threadId), [threadId]);

  return useAISDKRuntime(chat, {
    adapters: { history: historyAdapter },
  });
}

export const Assistant = () => {
  const adapter = useMemo(() => createMastraThreadAdapter(), []);

  const runtime = unstable_useRemoteThreadListRuntime({
    runtimeHook: useMastraChatThreadRuntime,
    adapter,
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
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="https://www.assistant-ui.com/docs/getting-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Build Your Own ChatGPT UX
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Weather Assistant</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
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
