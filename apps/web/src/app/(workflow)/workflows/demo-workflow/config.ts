import type { WorkflowPageData } from "../../components/workflow-runner";

export const demoWorkflowConfig = {
  workflowId: "demo-workflow",
  name: "Control-Flow Demo",
  // Wider than the default: this workflow's input is a two-field form
  // (text + repeat) rather than a single line.
  inputWidth: 380,
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
