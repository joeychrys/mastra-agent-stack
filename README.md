# Mastra Agent Stack

A full-stack AI agent application with a Mastra-powered backend and a Next.js chat frontend. This monorepo pairs a TypeScript agent framework with a production-ready web app that includes authentication, payments, and a conversational UI built on [assistant-ui](https://github.com/Yonom/assistant-ui).

## Architecture

| Directory                | Package              | Description                    | Key Tech                                         |
| ------------------------ | -------------------- | ------------------------------ | ------------------------------------------------ |
| `apps/agents/`           | `@repo/agents`       | Mastra AI agent backend        | Mastra, TypeScript, Zod, PostgreSQL              |
| `apps/web/`              | `@repo/web`          | Next.js web app with chat UI   | Next.js 16, React 19, assistant-ui, Tailwind v4  |
| `packages/aui-mastra/`   | `@repo/aui-mastra`   | assistant-ui ↔ Mastra runtime glue | TypeScript, assistant-ui, TanStack Query     |

A shared `docker-compose.yml` runs a local PostgreSQL 16 instance with two databases:

- **`mastra`** — agent storage (threads, memory, tool state)
- **`betterauth`** — user auth and sessions (Better Auth + Drizzle ORM)

## Prerequisites

- **Node.js** >= 22.13 (backend requires it; frontend needs >= 18)
- **pnpm** (specified in `packageManager` field)
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Install all dependencies
make install

# 2. Create your .env files from the examples, then add your API keys
cp apps/agents/.env.example apps/agents/.env   # → OPENAI_API_KEY
cp apps/web/.env.example apps/web/.env         # → BETTER_AUTH_SECRET, Google OAuth creds, etc.

# 3. Start everything (PostgreSQL + backend + frontend)
make dev
```

This starts:

- **PostgreSQL** on `localhost:5432`
- **Mastra Studio** on `localhost:4111` (agent playground and debugging)
- **Next.js dev server** on `localhost:3000`

## Make Targets

Run `make help` to see all targets. The most common:

```bash
make install                          # install all dependencies
make dev                              # start db + backend + frontend
make dev app=web                      # start a single app (web | agents)
make stop                             # stop Docker services
make db-reset                         # destroy and recreate PostgreSQL volume
make auth-db action=migrate  env=local  # migrate the betterauth DB (local)
make auth-db action=generate env=local  # generate migration files from schema
make auth-db action=migrate  env=prod   # migrate betterauth DB on prod (Tailscale)
make auth-db action=studio   env=prod   # open Drizzle Studio against prod
make lint                             # lint + format check (Biome)
make fix                              # auto-fix lint + format issues
make typecheck                        # type-check all projects (turbo, cached)
make check                            # lint + typecheck (pre-commit sanity check)
make build                            # production build all projects (turbo, cached)
make build app=web                    # build a single app (web | agents)
make nuke                             # full reset (clean + remove deps + stop Docker)
```

Parameterized targets: `dev`, `build`, `typecheck` accept `app=web|agents`;
`auth-db` **requires** `action=migrate|generate|push|studio` and `env=local|prod`
(prod manages the betterauth database over Tailscale and only allows
`migrate`/`studio`). Run `make help` for the full list.

## Project Structure

### Backend (`apps/agents/`)

```
apps/agents/src/mastra/
  index.ts          # Mastra entry point and configuration
  agents/           # Agent definitions (behavior, goals, model, tools)
  tools/            # Reusable tools agents can call
  workflows/        # Multi-step orchestrated workflows
  scorers/          # Agent performance evaluation
  processors/       # Data processors
  auth/             # JWT/JWKS auth integration
```

### Frontend (`apps/web/`)

```
apps/web/src/app/
  (auth)/               # Sign-in, sign-up, reset-password (no nav)
  (main)/               # Home, dashboard, account, admin, pricing, payment
  (chat)/               # Full-viewport agent chat interface
    weather-assistant/  # One route per agent (assistant.tsx + tool UIs)
    components/         # Chat UI components (thread, sidebar, markdown, tools)
    lib/                # Mastra API client, thread adapter, query client
  (workflow)/           # Full-viewport workflow runner (React Flow graph)
    workflows/<id>/     # One folder per workflow (config.ts + page.tsx + components)
    components/         # Runner, graph, node shells, run-history sidebar
    hooks/              # Workflow definition, live run, and run-history hooks
    lib/                # Canvas config, status helpers, shared types
```

The app uses route groups for layout isolation — `(auth)` pages have no navigation bar, `(main)` pages have one, and `(chat)` / `(workflow)` take over the full viewport.

### Workflow UI

Every workflow has an explicit route; there is intentionally **no** dynamic
`[workflowId]` page. A workflow folder looks like this:

```
(workflow)/workflows/weather-workflow/
  config.ts           # static data: ids, copy, node widths, canvas
  page.tsx            # composes <WorkflowRunner>, supplies renderInput / renderStep
  city-input.tsx      # this workflow's input form
  activity-card.tsx   # custom rendering for one step's output
```

- **Structure comes from Mastra at runtime** — the step graph, input schema, and
  resume schemas are fetched from the API. Pages only supply presentation.
- **`renderInput`** builds the graph's first node. Omit it and the input node
  renders a disabled JSON placeholder, so an unfinished page looks unfinished.
- **`renderStep(stepId, output)`** returns a component for a given step, or
  `undefined` to fall back to the raw-JSON view.
- **`canvas` is required** in every `config.ts` (node width, spacing, zoom
  limits). `lib/graph-config.ts` exports the `CanvasConfig` type and layout
  internals but deliberately **no default values**, so each page states its own
  and the build fails if one is missing.
- Config files are `.ts`, never `.tsx` — JSX can't leak into config, so anything
  that renders lives in `page.tsx` or a colocated component.

Adding a workflow means creating that folder and adding a card to
`(main)/workflows/page.tsx` (the listing is hardcoded on purpose).

### Cross-App Contracts

There is no shared-types package. The Mastra REST API is the contract between the
apps: structure data (workflows, agents, schemas) is fetched at runtime
(`GET /api/workflows/:id`, `GET /api/agents`), and presentation types are owned by
the component that renders the data. Agents are always referenced by their `id`
(e.g. `"weather-agent"`), never the backend registration map key.

## Environment Variables

Both apps have `.env.example` files. Copy each to `.env` and fill in your keys:

```bash
cp apps/agents/.env.example apps/agents/.env
cp apps/web/.env.example apps/web/.env
```

**`apps/agents/.env`**

| Variable       | Purpose                          |
| -------------- | -------------------------------- |
| `OPENAI_API_KEY` | OpenAI model provider key      |
| `DATABASE_URL`   | PostgreSQL connection (mastra db) |
| `JWKS_URL`       | Better Auth JWKS endpoint      |
| `JWT_ISSUER`     | JWT issuer URL                 |
| `JWT_AUDIENCE`   | JWT audience URL               |

**`apps/web/.env`**

| Variable                | Purpose                              |
| ----------------------- | ------------------------------------ |
| `NEXT_PUBLIC_MASTRA_URL`| Mastra backend URL (default: localhost:4111) |
| `BETTER_AUTH_SECRET`    | Auth encryption secret               |
| `DATABASE_URL`          | PostgreSQL connection (betterauth db) |
| `GOOGLE_CLIENT_ID`      | Google OAuth client ID               |
| `GOOGLE_CLIENT_SECRET`  | Google OAuth client secret           |
| `RESEND_API_KEY`        | Email sending (Resend)               |
| `POLAR_ACCESS_TOKEN`    | Polar.sh payments                    |

## Development Workflow

### Running Individual Projects

```bash
# Backend only
cd apps/agents && pnpm dev

# Frontend only
cd apps/web && pnpm dev
```

### Database Migrations

The `betterauth` database schema is managed with Drizzle (in `apps/web`) via the
`auth-db` target, which requires both `action` and `env`. After changing the
schema:

```bash
make auth-db action=generate env=local   # generate migration files
make auth-db action=migrate  env=local   # apply migrations
```

After a fresh clone or `make db-reset`:

```bash
make auth-db action=migrate env=local    # set up betterauth tables
```

### Production Database Migrations

The production web image does **not** bundle any migration tooling — it ships as a
pure Next.js runtime artifact. Migrations are applied from a trusted operator
machine that reaches the production database over [Tailscale](https://tailscale.com),
reusing the `drizzle-kit` toolchain already in `apps/web`.

**One-time setup:** copy the template and fill in the production connection string
(use the database host's Tailscale name or `100.x.y.z` IP):

```bash
cp apps/web/.env.prod-db.example apps/web/.env.prod-db
# edit apps/web/.env.prod-db → set DATABASE_URL
```

`apps/web/.env.prod-db` is gitignored (`.env*` in `apps/web/.gitignore`) — never
commit it. It is deliberately **not** named `.env.production`: Next.js auto-loads
that filename during `next build`, which would point local production builds at
the prod database.

**Apply migrations / browse the database** (with Tailscale connected):

```bash
make auth-db action=migrate env=prod   # apply versioned migrations to prod
make auth-db action=studio  env=prod   # open Drizzle Studio (https://local.drizzle.studio)
```

These map to `pnpm --filter @repo/web db:migrate:prod` / `db:studio:prod`, which
load `apps/web/.env.prod-db` and run `drizzle-kit` with `apps/web` as the working
directory (where `drizzle.config.ts`, the schema, and the versioned SQL in
`src/drizzle/` live).

> **Guardrail:** against production only `migrate`/`studio` are permitted (the
> `auth-db` target refuses `push`/`generate` when `env=prod`). `migrate` applies
> reviewed, versioned SQL from `apps/web/src/drizzle/`. **Never run `db:push`
> against production** — it diffs the schema directly and can drop or alter
> columns without a migration file. Run migrations **before** deploying an image that
> expects the new schema.

### Linting and Formatting

A Husky + lint-staged pre-commit hook runs Biome on staged files automatically. To run manually:

```bash
make lint           # check for issues
make fix            # auto-fix issues
make typecheck      # type-check all projects (cached via Turborepo)
```

## Tech Stack

**Backend**
- [Mastra](https://mastra.ai) — AI agent framework
- TypeScript (strict, ES2022, ESM)
- Zod — runtime schema validation
- PostgreSQL 16 — agent storage

**Frontend**
- [Next.js 16](https://nextjs.org) with Turbopack
- React 19
- [assistant-ui](https://github.com/Yonom/assistant-ui) — chat interface components
- [React Flow](https://reactflow.dev) — workflow graph canvas
- [Better Auth](https://www.better-auth.com) — authentication
- [Drizzle ORM](https://orm.drizzle.team) — type-safe database access
- [Polar.sh](https://polar.sh) — payments and subscriptions
- Tailwind CSS v4 + shadcn/ui
- TanStack Query — server state management

**Tooling**
- pnpm workspaces — monorepo package management
- [Turborepo](https://turbo.build) — build orchestration and caching
- Biome — linting and formatting
- Husky + lint-staged — pre-commit hooks
- Docker Compose — local PostgreSQL

## License

ISC
