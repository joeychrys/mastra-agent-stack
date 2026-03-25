# ── Base ──────────────────────────────────────────────────────────────
FROM docker.io/node:22.14-bookworm-slim AS base
RUN corepack enable pnpm

# ── Dependencies ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace scaffolding + agents package manifest
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/agents/package.json ./apps/agents/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile --filter @repo/agents...

# ── Build ────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/ ./
COPY apps/agents ./apps/agents
COPY packages/shared-types ./packages/shared-types

# mastra build produces a self-contained .mastra/output directory
RUN pnpm --filter @repo/agents build

# ── Production ───────────────────────────────────────────────────────
FROM docker.io/node:22.14-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 mastra
RUN adduser --system --uid 1001 mastra

# Copy the self-contained Mastra server output
COPY --from=builder --chown=mastra:mastra /app/apps/agents/.mastra/output ./

USER mastra

EXPOSE 4111
ENV PORT=4111
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4111/health || exit 1

CMD ["node", "index.mjs"]
