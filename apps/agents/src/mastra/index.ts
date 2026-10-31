import { chatRoute, workflowRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MASTRA_RESOURCE_ID_KEY } from "@mastra/core/request-context";
import { PinoLogger } from "@mastra/loggers";
import { MastraStorageExporter, Observability, SensitiveDataFilter } from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { getAuthenticatedUser } from "@mastra/server/auth";
import { activityPlannerAgent } from "./agents/activity-planner-agent";
import { citySuggestionAgent } from "./agents/city-suggestion-agent";
import { summarizerAgent } from "./agents/summarizer-agent";
import { weatherAgent } from "./agents/weather-agent";
import { JwksAuth } from "./auth/jwks-auth";
import { UsageLogger } from "./processors/usage-logger";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { weatherWorkflow } from "./workflows/activity-planner";
import { demoWorkflow } from "./workflows/demo-workflow";

export const mastra = new Mastra({
  workflows: { weatherWorkflow, demoWorkflow },
  agents: { weatherAgent, summarizerAgent, activityPlannerAgent, citySuggestionAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL ?? "",
  }),
  server: {
    auth: process.env.ENABLE_AUTH === "true" ? new JwksAuth() : undefined,
    middleware: [
      async (c, next) => {
        const token = c.req.header("Authorization");
        if (!token) return next();

        const user = await getAuthenticatedUser<{ id: string }>({
          mastra: c.get("mastra"),
          token,
          request: c.req.raw,
        });

        if (user) {
          const requestContext = c.get("requestContext");
          requestContext.set(MASTRA_RESOURCE_ID_KEY, user.id);
        }

        return next();
      },
    ],
    apiRoutes: [
      // Stream versions must match the web app's AI SDK major (`ai@7`).
      chatRoute({
        path: "/chat/:agentId",
        version: "v7",
      }),
      workflowRoute({
        path: "/workflow/:workflowId",
        version: "v7",
        includeTextStreamParts: false,
      }),
    ],
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["http://localhost:3000"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["*"],
      credentials: true,
    },
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter(), new UsageLogger()],
      },
    },
  }),
});
