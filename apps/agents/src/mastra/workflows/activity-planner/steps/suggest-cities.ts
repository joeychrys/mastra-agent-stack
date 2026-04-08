import { Agent } from "@mastra/core/agent";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { citySuggestionSchema } from "../schemas";

const citySuggestionAgent = new Agent({
  id: "city-suggestion",
  name: "city-suggestion",
  instructions: `You are a geography expert. Given a user's location query, determine the most likely cities they mean.

Rules:
- If the city is clearly unambiguous (e.g. "Chicago", "Tokyo", "London"), return exactly one result.
- If the city name is ambiguous (e.g. "Springfield", "Portland", "Richmond"), return up to 3 of the most likely options ordered by population and prominence.
- Always include the state/province/region and country for each suggestion.
- Focus on well-known, populated cities that a real user would plausibly mean.
- Never include obscure villages, tiny settlements, or places with negligible populations.
- If the input is in another language, translate the location to English.`,
  model: "openai/gpt-4o-mini",
});

const suggestionsOutputSchema = z.object({
  suggestions: z
    .array(citySuggestionSchema)
    .min(1)
    .max(3)
    .describe("The most likely cities matching the user's query"),
});

export const suggestCities = createStep({
  id: "suggest-cities",
  description: "Uses an agent to suggest likely cities from user input, suspending if ambiguous",
  inputSchema: z.object({
    city: z.string().describe("Freeform location input (e.g. 'Dallas Texas', 'weather in Paris')"),
  }),
  outputSchema: citySuggestionSchema,
  suspendSchema: z.object({
    message: z.string(),
    options: z.array(citySuggestionSchema),
  }),
  resumeSchema: citySuggestionSchema,
  execute: async ({ inputData, resumeData, suspend }) => {
    // Resuming with a user-selected city
    if (resumeData) {
      return {
        city: resumeData.city,
        region: resumeData.region,
        country: resumeData.country,
      };
    }

    if (!inputData) {
      throw new Error("Input data not found");
    }

    const response = await citySuggestionAgent.generate(
      `What city or cities might the user mean by: "${inputData.city}"?

If the answer is obvious, return just one. If ambiguous, return up to 3 ordered by likelihood.`,
      {
        structuredOutput: {
          schema: suggestionsOutputSchema,
        },
      },
    );

    const { suggestions } = response.object;

    // Unambiguous — proceed directly
    if (suggestions.length === 1) {
      return suggestions[0];
    }

    // Ambiguous — suspend and let the user pick
    return await suspend({
      message: `Multiple cities match "${inputData.city}". Please select one:`,
      options: suggestions,
    });
  },
});
