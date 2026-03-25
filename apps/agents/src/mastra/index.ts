import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MASTRA_RESOURCE_ID_KEY } from "@mastra/core/request-context";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { summarizerAgent } from "./agents/summarizer-agent";
import { weatherAgent } from "./agents/weather-agent";
import { UsageLogger } from "./processors/usage-logger";
import {
  completenessScorer,
  toolCallAppropriatenessScorer,
  translationScorer,
} from "./scorers/weather-scorer";
import { weatherWorkflow } from "./workflows/weather-workflow";

const jwksUrl = process.env.JWKS_URL;
const jwtIssuer = process.env.JWT_ISSUER;
const jwtAudience = process.env.JWT_AUDIENCE;
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, summarizerAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL!,
  }),
  server: {
    middleware: [
      {
        handler: async (c, next) => {
          if (!jwks) {
            return new Response("JWKS not configured", { status: 500 });
          }

          const authHeader = c.req.header("Authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }

          const token = authHeader.slice(7);
          try {
            const { payload } = await jwtVerify(token, jwks, {
              issuer: jwtIssuer || undefined,
              audience: jwtAudience || undefined,
            });

            if (!payload.sub) {
              return new Response("Unauthorized", { status: 401 });
            }

            const requestContext = c.get("requestContext");
            requestContext.set(MASTRA_RESOURCE_ID_KEY, payload.sub);
          } catch {
            return new Response("Invalid or expired token", { status: 401 });
          }

          await next();
        },
        path: "*",
      },
    ],
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
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
        exporters: [new DefaultExporter(), new CloudExporter()],
        spanOutputProcessors: [new SensitiveDataFilter(), new UsageLogger()],
      },
    },
  }),
});
