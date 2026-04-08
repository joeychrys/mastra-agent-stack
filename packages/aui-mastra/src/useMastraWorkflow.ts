"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import type { MastraWorkflowConfig, WorkflowData } from "./types";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

/** A workflow step that has suspended and is waiting for user input. */
export type SuspendedStep = {
  /** The step ID (e.g. "resolve-city"). */
  stepId: string;
  /** The suspend payload sent by the step. */
  payload: Record<string, unknown>;
};

export type MastraWorkflowReturn = {
  /** Raw messages from useChat. Render these manually. */
  messages: ReturnType<typeof useChat>["messages"];

  /** Chat status — "ready", "streaming", "error", etc. */
  status: ReturnType<typeof useChat>["status"];

  /**
   * Start the workflow with a text input.
   * The text is transformed via `mapInput` into `inputData`.
   */
  sendInput: (text: string) => void;

  /**
   * Resume a suspended workflow step.
   *
   * @param runId   — the workflow run ID (from `runId` in this return)
   * @param stepId  — the step that suspended (from `suspendedStep.stepId`)
   * @param data    — the resume payload matching the step's `resumeSchema`
   * @param label   — optional text shown as the user message
   */
  resume: (runId: string, stepId: string, data: unknown, label?: string) => void;

  /** The latest workflow data snapshot (derived from messages). */
  workflowData: WorkflowData | null;

  /** The current workflow run ID. */
  runId: string;

  /** The currently suspended step, if any. */
  suspendedStep: SuspendedStep | null;
};

// ---------------------------------------------------------------------------
// useMastraWorkflow
// ---------------------------------------------------------------------------

/**
 * Connect to a Mastra workflow via `useChat` + `DefaultChatTransport`.
 *
 * Returns raw chat state with workflow-specific helpers for suspend/resume.
 * Render messages manually — this does NOT use assistant-ui.
 *
 * @example
 * ```tsx
 * const { messages, status, sendInput, resume, workflowData, suspendedStep, runId } =
 *   useMastraWorkflow({
 *     baseUrl: "http://localhost:4111",
 *     workflowId: "weather-workflow",
 *     mapInput: (text) => ({ city: text }),
 *   });
 * ```
 */
export function useMastraWorkflow(config: MastraWorkflowConfig): MastraWorkflowReturn {
  const { baseUrl, workflowId, workflowPath = "/workflow", headers, mapInput } = config;

  const workflowUrl = `${baseUrl}${workflowPath}/${workflowId}`;

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: workflowUrl,
      headers,
      prepareSendMessagesRequest: ({ messages: msgs }) => {
        const lastMessage = msgs[msgs.length - 1];
        const text = lastMessage?.parts?.find(
          (p): p is { type: "text"; text: string } => p.type === "text",
        )?.text;
        const metadata = (lastMessage?.metadata ?? {}) as Record<string, unknown>;

        // Resume flow — metadata carries the resume payload
        if (metadata.__resume) {
          return {
            body: {
              runId: metadata.runId,
              step: metadata.step,
              resumeData: metadata.resumeData,
            },
          };
        }

        // Normal flow — map text to inputData
        return {
          body: {
            inputData: mapInput(text ?? ""),
          },
        };
      },
    }),
  });

  // Derive workflow state from messages
  const { workflowData, runId, suspendedStep } = useMemo(() => {
    let latestData: WorkflowData | null = null;
    let latestRunId = "";

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        if (part.type === "data-workflow") {
          latestData = part.data as unknown as WorkflowData;
          latestRunId = (part as unknown as { id?: string }).id ?? "";
        }
      }
    }

    let suspended: SuspendedStep | null = null;
    if (latestData?.status === "suspended") {
      for (const [stepId, step] of Object.entries(latestData.steps)) {
        if (step.status === "suspended" && step.suspendPayload) {
          suspended = { stepId, payload: step.suspendPayload };
        }
      }
    }

    return { workflowData: latestData, runId: latestRunId, suspendedStep: suspended };
  }, [messages]);

  const sendInput = (text: string) => {
    setMessages([]);
    sendMessage({ text });
  };

  const resume = (rId: string, stepId: string, data: unknown, label?: string) => {
    setMessages([]);
    sendMessage({
      text: label || "Continue",
      metadata: {
        __resume: true,
        runId: rId,
        step: stepId,
        resumeData: data,
      },
    });
  };

  return { messages, status, sendInput, resume, workflowData, runId, suspendedStep };
}
