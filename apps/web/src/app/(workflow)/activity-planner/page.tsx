"use client";

import { useMastraWorkflow } from "@repo/aui-mastra";
import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizeable";
import { getAuthToken } from "@/hooks/use-auth-token";
import { ChatPanel } from "./components/chat-panel";
import type { CityOption } from "./components/city-select";
import { WorkflowSteps } from "./components/workflow-steps";

const MASTRA_BASE_URL = process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

export default function WorkflowPage() {
  const [input, setInput] = useState("");

  const { messages, status, sendInput, resume, workflowData, runId, suspendedStep } =
    useMastraWorkflow({
      baseUrl: MASTRA_BASE_URL,
      workflowId: "weather-workflow",
      resourceId: "authenticated-user",
      mapInput: (text) => ({ city: text }),
      headers: async (): Promise<Record<string, string>> => {
        try {
          const token = await getAuthToken();
          return { Authorization: `Bearer ${token}` };
        } catch {
          // Prevent unhandled rejection — the API call will fail with 401
          // and useChat will surface the error via `status`.
          return {};
        }
      },
    });

  const handleResume = useCallback(
    (city: CityOption) => {
      if (!suspendedStep) return;
      const resumePayload = {
        city: city.city,
        region: city.region,
        country: city.country,
      };
      const label = [city.city, city.region, city.country].filter(Boolean).join(", ");
      resume(runId, suspendedStep.stepId, resumePayload, label);
    },
    [resume, runId, suspendedStep],
  );

  const handleSubmit = useCallback(
    (city: string) => {
      sendInput(city);
      setInput("");
    },
    [sendInput],
  );

  const isEmpty = messages.length === 0;
  const isReady = status === "ready";

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize={50} minSize={30}>
        {workflowData ? (
          <div className="h-full overflow-y-auto p-5">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Workflow Progress
            </h2>
            <div className="mt-3">
              <WorkflowSteps data={workflowData} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <div className="text-center">
              <MapPin className="text-muted-foreground/30 mx-auto size-10" />
              <p className="text-muted-foreground mt-3 text-sm">
                Enter a city to see the forecast and activity suggestions here.
              </p>
            </div>
          </div>
        )}
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={50} minSize={30}>
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          isReady={isReady}
          isEmpty={isEmpty}
          suspendedStep={suspendedStep}
          onSubmit={handleSubmit}
          onResume={handleResume}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
