"use client";

import { WorkflowRunner } from "../../components/workflow-runner";
import { ActivityCard } from "./activity-card";
import { CityInput } from "./city-input";
import { weatherWorkflowConfig } from "./config";

export default function WeatherWorkflowPage() {
  return (
    <WorkflowRunner
      {...weatherWorkflowConfig}
      renderInput={(props) => <CityInput {...props} />}
      renderStep={(stepId, output) =>
        stepId === "plan-activities" ? <ActivityCard output={output} /> : undefined
      }
    />
  );
}
