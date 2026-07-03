import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Demo workflow — exercises every control-flow construct so the generic
// workflow UI can be tested against non-linear graphs. No LLM calls; steps are
// deterministic with small delays so running states are visible in the UI.
//
//   normalize
//     → parallel: [shout, count-stats]
//     → combine (fan-in)
//     → branch: [long-text | short-text]
//     → review (suspends for a comment — generic resume form)
//     → finalize
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizedSchema = z.object({
  text: z.string(),
  repeat: z.number(),
});

const combinedSchema = z.object({
  summary: z.string(),
  length: z.number(),
});

const verdictSchema = z.object({
  verdict: z.string(),
});

const normalize = createStep({
  id: "normalize",
  description: "Trims and lowercases the input text",
  inputSchema: z.object({
    text: z.string().describe("Any text to process"),
    repeat: z.number().describe("How many times to repeat the shout (e.g. 3)"),
  }),
  outputSchema: normalizedSchema,
  execute: async ({ inputData }) => {
    await delay(600);
    return { text: inputData.text.trim().toLowerCase(), repeat: inputData.repeat };
  },
});

const shout = createStep({
  id: "shout",
  description: "Uppercases and repeats the text (runs in parallel with count-stats)",
  inputSchema: normalizedSchema,
  outputSchema: z.object({ shouted: z.string() }),
  execute: async ({ inputData }) => {
    await delay(1200);
    const times = Math.max(1, Math.min(10, Math.round(inputData.repeat)));
    return {
      shouted: Array.from({ length: times }, () => inputData.text.toUpperCase()).join("! "),
    };
  },
});

const countStats = createStep({
  id: "count-stats",
  description: "Counts characters and words (runs in parallel with shout)",
  inputSchema: normalizedSchema,
  outputSchema: z.object({ chars: z.number(), words: z.number() }),
  execute: async ({ inputData }) => {
    await delay(800);
    return {
      chars: inputData.text.length,
      words: inputData.text.split(/\s+/).filter(Boolean).length,
    };
  },
});

const combine = createStep({
  id: "combine",
  description: "Merges the parallel results into a single summary",
  // Parallel outputs arrive keyed by step id.
  inputSchema: z.object({
    shout: z.object({ shouted: z.string() }),
    "count-stats": z.object({ chars: z.number(), words: z.number() }),
  }),
  outputSchema: combinedSchema,
  execute: async ({ inputData }) => {
    await delay(600);
    const { chars, words } = inputData["count-stats"];
    return {
      summary: `${inputData.shout.shouted} (${chars} chars, ${words} words)`,
      length: chars,
    };
  },
});

const longText = createStep({
  id: "long-text",
  description: "Branch taken when the text is longer than 20 characters",
  inputSchema: combinedSchema,
  outputSchema: verdictSchema,
  execute: async ({ inputData }) => {
    await delay(600);
    return { verdict: `Long text (${inputData.length} chars): ${inputData.summary}` };
  },
});

const shortText = createStep({
  id: "short-text",
  description: "Branch taken when the text is 20 characters or fewer",
  inputSchema: combinedSchema,
  outputSchema: verdictSchema,
  execute: async ({ inputData }) => {
    await delay(600);
    return { verdict: `Short text (${inputData.length} chars): ${inputData.summary}` };
  },
});

const review = createStep({
  id: "review",
  description: "Suspends so a human can attach a comment to the verdict",
  // Branch outputs arrive keyed by whichever step executed.
  inputSchema: z.object({
    "long-text": verdictSchema.optional(),
    "short-text": verdictSchema.optional(),
  }),
  outputSchema: z.object({ verdict: z.string(), comment: z.string() }),
  suspendSchema: z.object({ message: z.string() }),
  resumeSchema: z.object({
    comment: z.string().describe("Your review comment"),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const verdict = inputData["long-text"]?.verdict ?? inputData["short-text"]?.verdict ?? "";
    if (resumeData) {
      return { verdict, comment: resumeData.comment };
    }
    return await suspend({
      message: `Review the verdict: "${verdict}". Add a comment to continue.`,
    });
  },
});

const finalize = createStep({
  id: "finalize",
  description: "Produces the final result",
  inputSchema: z.object({ verdict: z.string(), comment: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    await delay(600);
    return { result: `${inputData.verdict} — reviewer said: "${inputData.comment}"` };
  },
});

const demoWorkflow = createWorkflow({
  id: "demo-workflow",
  description: "Control-flow demo: parallel fan-out, conditional branch, and a review suspend.",
  inputSchema: z.object({
    text: z.string().describe("Any text to process"),
    repeat: z.number().describe("How many times to repeat the shout (e.g. 3)"),
  }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(normalize)
  .parallel([shout, countStats])
  .then(combine)
  .branch([
    [async ({ inputData }) => inputData.length > 20, longText],
    [async ({ inputData }) => inputData.length <= 20, shortText],
  ])
  .then(review)
  .then(finalize);

demoWorkflow.commit();

export { demoWorkflow };
