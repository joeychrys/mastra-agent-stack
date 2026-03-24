# Deployment

This directory contains the Dockerfile and environment configuration for production deployment via Dokploy.

## Docker Build Stages

The Dockerfile uses a multi-stage build to produce a minimal production image. Each stage has a specific purpose, and independent stages run in parallel to minimize build time.

### Stage 1: `base`

```dockerfile
FROM docker.io/node:22.14-bookworm-slim AS base
RUN corepack enable pnpm
```

The shared base image for all other stages. Uses Node.js 22 on Debian Bookworm (slim variant) and enables pnpm via corepack. Every subsequent stage inherits from this.

### Stage 2: `deps`

```dockerfile
FROM base AS deps
COPY ./next-app/package.json ./next-app/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
```

Installs the full dependency tree (including devDependencies) from the lockfile. This stage is cached by Docker -- it only re-runs when `package.json` or `pnpm-lock.yaml` change, which makes subsequent builds fast.

### Stage 3: `builder`

```dockerfile
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY ./next-app ./
RUN pnpm run build
```

Copies the installed `node_modules` from `deps` and the full `next-app/` source code, then runs `next build`. This produces the `.next/standalone/` output -- a self-contained production bundle with only the files and modules the app actually needs at runtime (via Next.js output tracing). The standalone output does **not** include source files like `drizzle.config.ts` or `src/db/schema.ts` since they aren't imported by the app at runtime.

**Build-time environment variables:** Server-side env vars (`DATABASE_URL`, `RESEND_API_KEY`, etc.) are passed as build args. These only need to satisfy module initialization during the build -- they don't need to be real credentials. `NEXT_PUBLIC_*` vars use placeholder values (`https://PLACEHOLDER_REPLACE_ME_*`) that get replaced at container start by `entrypoint.sh`. This placeholder-and-replace pattern is based on [a very heated discussion on Next.js's repo.](https://github.com/vercel/next.js/discussions/17641#discussioncomment-9376344)

### Stage 4: `runner`

```dockerfile
FROM base AS runner
```

The final production image. It assembles the minimal runtime from the previous stages:

1. **Standalone output** from `builder` -- `server.js`, traced `node_modules`, compiled code
2. **Static assets** from `builder` -- `.next/static/`
3. **Drizzle files** from `builder` -- `drizzle.config.ts`, `src/db/schema.ts`, `src/drizzle/*.sql` (copied to their original paths so drizzle-kit commands work the same as in local dev)
4. **Drizzle tooling** -- `drizzle-kit`, `drizzle-orm`, and `pg` are installed in an isolated `/app/drizzle-tools/` directory to avoid clobbering the standalone output's traced `node_modules`. The `drizzle-kit` binary is added to `PATH` so it works directly from `/app/`.
5. **Entrypoint script** -- `scripts/entrypoint.sh` for `NEXT_PUBLIC_*` placeholder replacement

The container runs as a non-root user (`nextjs:nodejs`, uid/gid 1001) and exposes port 3000.

### Build stage execution order

```
deps ──────> builder ──────> runner
```

## Deploying with Dokploy

### Initial Setup

1. **Create a Dokploy application** in your Dokploy dashboard. Choose "Docker" as the source type and configure it to pull from GitHub Container Registry (GHCR).

2. **Configure the image source** to point to your GHCR image:
   ```
   ghcr.io/<github-owner>/better-starter:latest
   ```

3. **Set environment variables** in the Dokploy application settings. Use `dokploy/env.example` as a reference. All of these are required at runtime:

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_BASE_URL` | Your production URL (e.g., `https://app.example.com`) |
   | `BETTER_AUTH_SECRET` | Auth secret key (generate a random string) |
   | `BETTER_AUTH_URL` | Same as `NEXT_PUBLIC_BASE_URL` |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `RESEND_API_KEY` | Resend email API key |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `POLAR_ACCESS_TOKEN` | Polar.sh access token |
   | `POLAR_WEBHOOK_SECRET` | Polar.sh webhook secret |

4. **Configure the port** to `3000` in Dokploy's network settings.

5. **Set up a domain** in Dokploy and point your DNS to the Dokploy server's IP.

### How Deployments Work

Deployments are triggered automatically by GitHub Actions when you push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow (`.github/workflows/production.yml`):
1. Builds the Docker image using this Dockerfile
2. Pushes it to GHCR tagged with the version, minor version, and `latest`
3. Calls the Dokploy API to trigger a deployment

Dokploy then pulls the new image and restarts the container with the environment variables configured in step 3 above.

### Running Database Migrations

The production image includes `drizzle-kit` and all Drizzle source files at their original paths. To run migrations after a deployment, open the **Terminal** in Dokploy's application dashboard and run:

```bash
drizzle-kit migrate
```

Other Drizzle commands also work:

```bash
drizzle-kit push       # Push schema changes directly
drizzle-kit pull       # Introspect the production database
drizzle-kit studio     # Open Drizzle Studio (requires port access)
```

Migrations are **not** run automatically on deploy. You only need to run them when a deployment includes schema changes.

### How NEXT_PUBLIC_* Variables Work at Runtime

Next.js bakes `NEXT_PUBLIC_*` variables into the JavaScript bundle at build time. To avoid rebuilding for every environment, this image uses a placeholder pattern:

1. **At build time**, `NEXT_PUBLIC_BASE_URL` is set to `https://PLACEHOLDER_REPLACE_ME_BASE_URL`
2. **At container start**, `scripts/entrypoint.sh` finds all `.js` and `.json` files in `.next/` and replaces the placeholder string with the real value from the Dokploy environment variable
3. **Then** the Next.js server starts via `node server.js`

To add a new `NEXT_PUBLIC_*` variable with this pattern:
1. Add a placeholder `ENV` in the Dockerfile's builder stage
2. Add a replacement block in `scripts/entrypoint.sh`
3. Set the real value in Dokploy's environment variables

### Build-time vs Runtime Environment Variables

| Type | When used | Where configured | Real values needed? |
|---|---|---|---|
| `NEXT_PUBLIC_*` | Build (baked into JS) + Runtime (replaced by entrypoint) | Dockerfile ENV + Dokploy | Build: no (placeholders). Runtime: yes |
| Server-side (`DATABASE_URL`, etc.) | Build (module init) + Runtime (actual usage) | GitHub Secrets (build) + Dokploy (runtime) | Build: no (dummy values work). Runtime: yes |

### GitHub Secrets for CI/CD

These secrets are needed in your GitHub repository settings (**Settings > Secrets and variables > Actions > Repository secrets**):

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | Passed as build arg (dummy value is fine) |
| `BETTER_AUTH_SECRET` | Passed as build arg (dummy value is fine) |
| `RESEND_API_KEY` | Passed as build arg (dummy value is fine) |
| `GOOGLE_CLIENT_ID` | Passed as build arg (dummy value is fine) |
| `GOOGLE_CLIENT_SECRET` | Passed as build arg (dummy value is fine) |
| `POLAR_ACCESS_TOKEN` | Passed as build arg (dummy value is fine) |
| `POLAR_WEBHOOK_SECRET` | Passed as build arg (dummy value is fine) |
| `DOKPLOY_URL` | Your Dokploy instance hostname (e.g., `dokploy.example.com`) |
| `DOKPLOY_API_KEY` | Dokploy API key (generate in Dokploy dashboard) |
| `DOKPLOY_APP_ID` | The application ID from Dokploy |

### Troubleshooting

**Container crashes on startup:**
- Check logs in Dokploy's "Logs" tab
- Verify all required environment variables are set
- Ensure `DATABASE_URL` is reachable from the container

**Migrations fail:**
- Open Dokploy terminal and check the database connection: verify `echo $DATABASE_URL` returns a valid connection string
- Make sure the database server is reachable from the container's network

**NEXT_PUBLIC_* values not updating:**
- The placeholder replacement runs once at container start. If you change a `NEXT_PUBLIC_*` variable in Dokploy, you need to restart the container (redeploy) for it to take effect.
