import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { activitiesPlanSchema } from "./schemas";
import { fetchWeather } from "./steps/fetch-weather";
import { geocodeCity } from "./steps/geocode-city";
import { planActivities } from "./steps/plan-activities";
import { suggestCities } from "./steps/suggest-cities";

// ---------------------------------------------------------------------------
// Workflow: suggest-cities → geocode-city → fetch-weather → plan-activities
//
//   suggest-cities may suspend for user disambiguation when the city name
//   is ambiguous (e.g. "Springfield"). Unambiguous inputs proceed directly.
// ---------------------------------------------------------------------------

const weatherWorkflow = createWorkflow({
  id: "weather-workflow",
  inputSchema: z.object({
    city: z.string().describe("Freeform location input (e.g. 'Dallas Texas', 'weather in Paris')"),
  }),
  outputSchema: activitiesPlanSchema,
})
  .then(suggestCities)
  .then(geocodeCity)
  .then(fetchWeather)
  .then(planActivities);

weatherWorkflow.commit();

export { weatherWorkflow };
