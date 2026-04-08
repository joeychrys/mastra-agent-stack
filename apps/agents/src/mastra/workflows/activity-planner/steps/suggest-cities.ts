import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { citySuggestionSchema } from "../schemas";

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
  execute: async ({ inputData, resumeData, suspend, mastra, requestContext }) => {
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

    const agent = mastra?.getAgent("citySuggestionAgent");
    if (!agent) {
      throw new Error("City suggestion agent not found");
    }

    const response = await agent.generate(
      `What city or cities might the user mean by: "${inputData.city}"?

If the answer is obvious, return just one. If ambiguous, return up to 3 ordered by likelihood.`,
      {
        structuredOutput: {
          schema: suggestionsOutputSchema,
        },
        requestContext,
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
