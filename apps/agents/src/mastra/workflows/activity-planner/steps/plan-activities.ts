import { createStep } from "@mastra/core/workflows";
import { activitiesPlanSchema, forecastSchema } from "../schemas";

export const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: activitiesPlanSchema,
  execute: async ({ inputData, mastra, requestContext }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const agent = mastra?.getAgent("activityPlannerAgent");
    if (!agent) {
      throw new Error("Activity planner agent not found");
    }

    const prompt = `Based on this weather forecast for ${forecast.location}, suggest activities.

Forecast: ${JSON.stringify(forecast)}

Respond with ONLY a JSON object (no markdown, no code fences) matching this exact shape:
{
  "morning": [{ "name": "...", "description": "...", "timing": "HH:MM AM - HH:MM AM", "note": "..." }],
  "afternoon": [{ "name": "...", "description": "...", "timing": "HH:MM PM - HH:MM PM", "note": "..." }],
  "indoor": [{ "name": "...", "description": "...", "note": "..." }],
  "considerations": ["..."]
}

Guidelines:
- 2-3 outdoor activities per time of day, 1-2 indoor alternatives
- Activities must be specific to ${forecast.location} (real venues, trails, parks)
- For precipitation > 50%, prioritize indoor activities
- Keep descriptions concise (one sentence)
- "timing" is a time range, "note" is a weather consideration`;

    const response = await agent.generate(prompt, { requestContext });

    const parsed = activitiesPlanSchema.parse(JSON.parse(response.text));
    return parsed;
  },
});
