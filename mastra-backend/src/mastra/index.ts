import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { weatherAgent } from "./agents/weather-agent";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { weatherWorkflow } from "./workflows/weather-workflow";

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL!,
  }),
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
    ],
    cors: {
      origin: ["http://localhost:3000"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["*"],
      credentials: false,
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
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});
