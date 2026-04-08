import { createStep } from "@mastra/core/workflows";
import { getWeatherCondition } from "../helpers";
import { forecastSchema, resolvedCitySchema } from "../schemas";

export const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast using resolved coordinates",
  inputSchema: resolvedCitySchema,
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Input data not found");
    }

    const { city, region, latitude, longitude } = inputData;
    const location = [city, region].filter(Boolean).join(", ");

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    return {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
      location,
    };
  },
});
