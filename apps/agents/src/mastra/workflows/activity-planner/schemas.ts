import { z } from "zod";

export const citySuggestionSchema = z.object({
  city: z.string().describe("City name (e.g. 'Springfield')"),
  region: z.string().optional().describe("State, province, or region (e.g. 'Illinois')"),
  country: z.string().describe("Country name (e.g. 'United States')"),
});

export const resolvedCitySchema = z.object({
  city: z.string(),
  region: z.string().optional().describe("State, province, or region for disambiguation"),
  latitude: z.number(),
  longitude: z.number(),
});

export const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});

export const activitySchema = z.object({
  name: z.string(),
  description: z.string(),
  timing: z.string().optional(),
  note: z.string().optional(),
});

export const activitiesPlanSchema = z.object({
  morning: z.array(activitySchema),
  afternoon: z.array(activitySchema),
  indoor: z.array(activitySchema),
  considerations: z.array(z.string()),
});
