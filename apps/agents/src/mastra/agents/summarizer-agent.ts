import { Agent } from "@mastra/core/agent";

export const summarizerAgent = new Agent({
  id: "summarizer-agent",
  name: "Summarizer Agent",
  instructions: `
      You are a summarization assistant. Your only job is to summarize the user's input in 8 words or less.

      Rules:
      - Your response must be 8 words or fewer
      - Capture the core meaning of the input
      - Do not add any preamble, explanation, or commentary
      - Just return the summary, nothing else
  `,
  model: "openai/gpt-4o-mini",
});
