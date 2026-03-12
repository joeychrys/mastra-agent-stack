# Base image
FROM docker.io/node:22.14-bookworm-slim AS base

# Install pnpm
RUN corepack enable pnpm

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
# RUN apt-get update && apt-get install -y libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY ./next-app/package.json ./next-app/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY ./next-app ./

# Build-time environment variables
# NEXT_PUBLIC_* use placeholder URLs that get replaced at runtime by entrypoint.sh
# These must be valid URLs because Next.js validates them during static generation
# The PLACEHOLDER_REPLACE_ME string is what gets swapped out at container start
ENV NEXT_PUBLIC_BASE_URL=https://PLACEHOLDER_REPLACE_ME_BASE_URL
ENV NEXT_PUBLIC_LANGGRAPH_URL=https://PLACEHOLDER_REPLACE_ME_LANGGRAPH_URL

# Server-side env vars needed at build time (for module initialization)
#
# IMPORTANT: These values are ONLY used during the build to satisfy
# module initialization. They do NOT need to be real/working credentials.
# You can use dummy values like "fake_key" in GitHub Secrets.
#
# At RUNTIME, Dokploy environment variables override these and MUST be
# real working credentials for the app to function.
#
# Example dummy values for GitHub Secrets:
#   DATABASE_URL=postgresql://fake:fake@localhost:5432/fake
#   RESEND_API_KEY=re_fake_key
#   POLAR_ACCESS_TOKEN=fake_token
#   POLAR_WEBHOOK_SECRET=fake_secret
#   GOOGLE_CLIENT_ID=fake_client_id
#   GOOGLE_CLIENT_SECRET=fake_client_secret
#   BETTER_AUTH_SECRET=fake_auth_secret
#
ARG DATABASE_URL
ARG RESEND_API_KEY
ARG POLAR_ACCESS_TOKEN
ARG POLAR_WEBHOOK_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG BETTER_AUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV RESEND_API_KEY=$RESEND_API_KEY
ENV POLAR_ACCESS_TOKEN=$POLAR_ACCESS_TOKEN
ENV POLAR_WEBHOOK_SECRET=$POLAR_WEBHOOK_SECRET
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm run build

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
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drizzle tooling for on-demand database management via Dokploy terminal:
#   drizzle-kit migrate | push | pull
# Installed in an isolated directory so pnpm doesn't clobber the standalone node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts ./src/db/schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/drizzle ./src/drizzle
RUN mkdir -p /app/drizzle-tools && \
    cd /app/drizzle-tools && \
    pnpm init && \
    pnpm add drizzle-kit drizzle-orm pg
ENV PATH="/app/drizzle-tools/node_modules/.bin:$PATH"

# Copy entrypoint script for runtime placeholder replacement
# Must be done before switching to nextjs user, and needs proper ownership
COPY --chown=nextjs:nodejs scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
