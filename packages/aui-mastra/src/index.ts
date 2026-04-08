// ---------------------------------------------------------------------------
// @repo/aui-mastra — AI SDK wrapper for Mastra
//
// Thin, opinionated layer over the AI SDK that configures it for a Mastra
// server.  Hooks for common use cases:
//
//   useMastraThreadListRuntime — full thread-list + chat (assistant-ui)
//   useMastraChat              — single-thread chat (assistant-ui runtime)
//   useMastraMemory            — thread CRUD via /api/memory/* endpoints
//   useMastraWorkflow          — workflow execution via workflowRoute
//
// Health monitoring is available via "@repo/aui-mastra/health" (server-only).
// ---------------------------------------------------------------------------

// History adapter (standalone, for custom setups)
export { createHistoryAdapter, type HistoryAdapterConfig } from "./createHistoryAdapter";
// Types
export type {
  HeadersConfig,
  MastraChatConfig,
  MastraChatMemoryConfig,
  MastraMemoryConfig,
  MastraMemoryMessage,
  MastraThread,
  MastraWorkflowConfig,
  WorkflowData,
  WorkflowStepResult,
  WorkflowStepStatus,
} from "./types";

// Single-thread chat
export { type MastraChatRuntimeOptions, useMastraChat } from "./useMastraChat";
// Memory hook (thread CRUD)
export { memoryKeys, useMastraMemory } from "./useMastraMemory";
// Thread-list runtime (multi-thread with sidebar)
export {
  type MastraThreadListConfig,
  useMastraThreadListRuntime,
} from "./useMastraThreadListRuntime";

// Workflow hook
export {
  type MastraWorkflowReturn,
  type SuspendedStep,
  useMastraWorkflow,
} from "./useMastraWorkflow";
