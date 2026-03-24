# Mastra Agent Stack

A full-stack AI agent application with a Mastra-powered backend and a Next.js chat frontend. This monorepo pairs a TypeScript agent framework with a production-ready web app that includes authentication, payments, and a conversational UI built on [assistant-ui](https://github.com/Yonom/assistant-ui).

## Architecture

| Directory   | Description                                    | Key Tech                                      |
| ----------- | ---------------------------------------------- | --------------------------------------------- |
| `agents/`   | Mastra AI agent backend                        | Mastra, TypeScript, Zod, PostgreSQL           |
| `next-app/` | Next.js web app with chat UI                   | Next.js 16, React 19, assistant-ui, Tailwind v4 |

A shared `docker-compose.yml` runs a local PostgreSQL 16 instance with two databases:

- **`mastra`** — agent storage (threads, memory, tool state)
- **`betterauth`** — user auth and sessions (Better Auth + Drizzle ORM)

## Prerequisites

- **Node.js** >= 22.13 (backend requires it; frontend needs >= 18)
- **pnpm** (specified in `packageManager` field)
- **Docker** (for PostgreSQL)

## Quick Start

```bash
# 1. Clone and setup (installs all deps, copies .env files)
make setup

# 2. Add your API keys
#    - agents/.env       → OPENAI_API_KEY
#    - next-app/.env     → BETTER_AUTH_SECRET, Google OAuth creds, etc.

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
make setup           # first-time setup: install deps + copy .env files
make dev             # start db + backend + frontend
make dev-backend     # backend only (Mastra Studio)
make dev-frontend    # frontend only (Next.js)
make stop            # stop Docker services
make db-reset        # destroy and recreate PostgreSQL volume
make db-migrate      # run Drizzle migrations (next-app)
make lint            # lint entire repo
make lint-fix        # lint + auto-fix
make typecheck       # type-check both projects
make check           # lint + typecheck (pre-commit sanity check)
make build           # production build both projects
make nuke            # full reset (clean + remove deps + stop Docker)
```

## Project Structure

### Backend (`agents/`)

```
agents/src/mastra/
  index.ts          # Mastra entry point and configuration
  agents/           # Agent definitions (behavior, goals, model, tools)
  tools/            # Reusable tools agents can call
  workflows/        # Multi-step orchestrated workflows
  scorers/          # Agent performance evaluation
  processors/       # Data processors
  auth/             # JWT/JWKS auth integration
```

### Frontend (`next-app/`)

```
next-app/src/app/
  (auth)/           # Sign-in, sign-up, reset-password (no nav)
  (main)/           # Home, dashboard, account, admin, pricing, payment
  (chat)/chat/      # Full-viewport AI chat interface
    assistant.tsx   # AssistantRuntimeProvider + thread management
    components/     # Chat UI components (thread, sidebar, markdown, tools)
    lib/            # Mastra API client, thread adapter, query client
    hooks/          # TanStack Query hooks for threads and messages
```

The app uses route groups for layout isolation — `(auth)` pages have no navigation bar, `(main)` pages have one, and `(chat)` takes over the full viewport.

## Environment Variables

Both projects have `.env.example` files. `make setup` copies them automatically.

**`agents/.env`**

| Variable       | Purpose                          |
| -------------- | -------------------------------- |
| `OPENAI_API_KEY` | OpenAI model provider key      |
| `DATABASE_URL`   | PostgreSQL connection (mastra db) |
| `JWKS_URL`       | Better Auth JWKS endpoint      |
| `JWT_ISSUER`     | JWT issuer URL                 |
| `JWT_AUDIENCE`   | JWT audience URL               |

**`next-app/.env`**

| Variable              | Purpose                              |
| --------------------- | ------------------------------------ |
| `BETTER_AUTH_SECRET`  | Auth encryption secret               |
| `DATABASE_URL`        | PostgreSQL connection (betterauth db) |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID               |
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret           |
| `RESEND_API_KEY`      | Email sending (Resend)               |
| `POLAR_ACCESS_TOKEN`  | Polar.sh payments                    |

## Development Workflow

### Running Individual Projects

```bash
# Backend only
cd agents && pnpm dev

# Frontend only
cd next-app && pnpm dev
```

### Database Migrations

After changing the Drizzle schema in `next-app`:

```bash
make db-generate    # generate migration files
make db-migrate     # apply migrations
```

After a fresh clone or `make db-reset`:

```bash
make db-migrate     # set up betterauth tables
```

### Linting and Formatting

A Husky + lint-staged pre-commit hook runs Biome on staged files automatically. To run manually:

```bash
make lint           # check for issues
make lint-fix       # auto-fix issues
make typecheck      # type-check both projects
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
- [Better Auth](https://www.better-auth.com) — authentication
- [Drizzle ORM](https://orm.drizzle.team) — type-safe database access
- [Polar.sh](https://polar.sh) — payments and subscriptions
- Tailwind CSS v4 + shadcn/ui
- TanStack Query — server state management

**Tooling**
- pnpm — package manager
- Biome — linting and formatting
- Husky + lint-staged — pre-commit hooks
- Docker Compose — local PostgreSQL

## License

ISC
