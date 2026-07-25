"use client";

import { WorkflowRunner } from "../../components/workflow-runner";
import { demoWorkflowConfig } from "./config";
import { DemoInput } from "./demo-input";

export default function DemoWorkflowPage() {
  return (
    <WorkflowRunner {...demoWorkflowConfig} renderInput={(props) => <DemoInput {...props} />} />
  );
}
