import type { WorkflowPageData } from "../../components/workflow-runner";

export const weatherWorkflowConfig = {
  workflowId: "weather-workflow",
  name: "Activity Planner",
  inputLabel: "City",
  inputDescription:
    "Enter any city to start. This kicks off the weather lookup and activity planning below.",
  inputWidth: 300,
  emptyMessage: "No runs yet. Enter a city to start one.",
  // Per-node width overrides, keyed by Mastra step id.
  stepWidths: { "plan-activities": 600 },
  canvas: {
    nodeWidth: 300,
    nodeSpacingX: 40,
    rowSpacingY: 50,
    fitViewPadding: 0.3,
    fitViewMaxZoom: 0.8,
    minZoom: 0.2,
    nodesDraggable: false,
  },
} satisfies WorkflowPageData;
