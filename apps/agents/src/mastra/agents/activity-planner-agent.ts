import { Agent } from "@mastra/core/agent";

export const activityPlannerAgent = new Agent({
  id: "activity-planner",
  name: "Activity Planner",
  instructions: `You are a helpful assistant that suggests activities based on weather conditions.
When responding, always return ONLY valid JSON with no markdown or code fences.`,
  model: "openai/gpt-4o-mini",
});
