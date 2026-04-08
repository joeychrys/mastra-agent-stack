import { createStep } from "@mastra/core/workflows";
import type { GeocodingResult } from "../helpers";
import { autoSelectCity } from "../helpers";
import { citySuggestionSchema, resolvedCitySchema } from "../schemas";

export const geocodeCity = createStep({
  id: "geocode-city",
  description: "Geocodes a city suggestion to get precise coordinates",
  inputSchema: citySuggestionSchema,
  outputSchema: resolvedCitySchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { city, region, country } = inputData;

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`;
    const response = await fetch(url);
    const data = (await response.json()) as { results?: GeocodingResult[] };

    if (!data.results?.length) {
      throw new Error(`No coordinates found for "${city}"`);
    }

    // Try to match using region/country context from the agent
    const selected = autoSelectCity(data.results, region, country);

    // Fallback to first result
    const result = selected ?? data.results[0];

    return {
      city: result.name,
      region: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
    };
  },
});
