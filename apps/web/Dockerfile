# Base image
FROM docker.io/node:22.23.3-bookworm-slim AS base

# Install pnpm
RUN corepack enable pnpm

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apt-get update && apt-get install -y libc6-compat
WORKDIR /app

# Copy workspace scaffolding + web package manifest for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/aui-mastra/package.json ./packages/aui-mastra/
RUN pnpm install --frozen-lockfile --filter @repo/web...

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY apps/web ./apps/web
COPY packages/aui-mastra ./packages/aui-mastra

# Build-time environment variables
# NEXT_PUBLIC_* use placeholder URLs that get replaced at runtime by entrypoint.sh
# These must be valid URLs because Next.js validates them during static generation
# The PLACEHOLDER_REPLACE_ME string is what gets swapped out at container start
ENV NEXT_PUBLIC_BASE_URL=https://PLACEHOLDER_REPLACE_ME_BASE_URL
ENV NEXT_PUBLIC_MASTRA_URL=https://PLACEHOLDER_REPLACE_ME_MASTRA_URL

# Server-side env vars needed at build time for module initialization only.
# These dummy values satisfy imports during `next build` — real credentials
# are injected at runtime via Dokploy environment variables.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV RESEND_API_KEY="re_build_placeholder"
ENV POLAR_ACCESS_TOKEN="build_placeholder"
ENV POLAR_WEBHOOK_SECRET="build_placeholder"
ENV GOOGLE_CLIENT_ID="build_placeholder"
ENV GOOGLE_CLIENT_SECRET="build_placeholder"
ENV BETTER_AUTH_SECRET="build_placeholder"

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV=production

RUN pnpm --filter @repo/aui-mastra build && pnpm --filter @repo/web build

# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json in case you need it for metadata or runtime dependencies
COPY --from=builder /app/apps/web/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Standalone output preserves the monorepo directory structure (apps/web/server.js).
# Static assets must be placed at apps/web/.next/static to match.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Database migrations are NOT run from this image. They are applied from a
# trusted operator machine that reaches the production database over Tailscale,
# using the drizzle-kit toolchain already present in apps/web.
# See README.md ("Production Database Migrations") for the workflow.

# Copy entrypoint script for runtime placeholder replacement
# Must be done before switching to nextjs user, and needs proper ownership
COPY --chown=nextjs:nodejs apps/web/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
