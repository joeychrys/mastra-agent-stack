# AGENTS.md

Guidance for AI coding agents working in this monorepo.

## Repository Structure

This is a two-project monorepo (no workspace manager — each project has independent dependencies):

| Directory   | Description                                      | Runtime       |
| ----------- | ------------------------------------------------ | ------------- |
| `agents/`   | Mastra AI agent framework backend (TypeScript)   | Node >= 22.13 |
| `next-app/` | Next.js 16 app with assistant-ui chat (React 19) | Node >= 18    |

A root `docker-compose.yml` provides a local PostgreSQL 16 instance (`localhost:5432`, user/password: `user`/`password`) with **two databases**:

| Database     | Used by                                | Connection string                                  |
| ------------ | -------------------------------------- | -------------------------------------------------- |
| `mastra`     | `agents/` (Mastra storage)             | `postgresql://user:password@localhost:5432/mastra`     |
| `betterauth` | `next-app/` (Better Auth + Drizzle ORM) | `postgresql://user:password@localhost:5432/betterauth` |

The second database (`betterauth`) is created automatically by `scripts/init-databases.sh` on first container startup.

A root `package.json` manages shared dev tooling (Husky, lint-staged, Biome).

A root `Makefile` provides convenient shortcuts — run `make help` to see all targets.

## Commands

### Makefile (recommended)

```bash
make setup               # first-time: install all deps + copy .env files
make dev                 # start db + backend + frontend (all at once)
make dev-backend         # start backend only (Mastra Studio at localhost:4111)
make dev-frontend        # start frontend only (Next.js dev server)
make stop                # stop Docker services
make db-migrate          # run Drizzle migrations (next-app)
make db-push             # push Drizzle schema to database (next-app)
make db-generate         # generate Drizzle migration files (next-app)
make db-studio           # open Drizzle Studio (next-app)
make db-reset            # reset PostgreSQL (destroy volume and restart)
make lint                # lint entire repo
make lint-fix            # lint + auto-fix entire repo
make typecheck           # type-check both projects
make check               # lint + typecheck (pre-commit sanity check)
make build               # production build both projects
make clean               # remove build artifacts
make nuke                # full reset (clean + remove deps + stop Docker)
```

### Root (shared tooling)

```bash
npm install              # install Husky, lint-staged, Biome (also initializes git hooks)
npx biome check .        # lint + format check across entire repo
npx biome check --write .  # lint + format with auto-fix across entire repo
```

### agents

```bash
cd agents
npm install              # install dependencies
npm run dev              # start Mastra Studio at localhost:4111
npm run build            # production build (mastra build)
npm run start            # start production server (mastra start)
npm run lint             # lint all files (biome check .)
npm run lint:fix         # lint and auto-fix (biome check --write .)
npm run format           # check formatting (biome format .)
npm run format:fix       # auto-format (biome format --write .)
npx tsc --noEmit         # type-check
```

No test framework is configured. If tests are added, prefer Vitest with ES modules.

### next-app

```bash
cd next-app
pnpm install             # install dependencies (uses pnpm)
pnpm dev                 # dev server with Turbopack
pnpm build               # production build
pnpm start               # start production server
pnpm lint                # lint (eslint)
pnpm lint:fix            # lint and auto-fix (eslint --fix)
pnpm format              # auto-format (prettier --write)
pnpm format:check        # check formatting (prettier --check)
pnpm db:migrate          # run Drizzle migrations
pnpm db:push             # push schema to database
pnpm db:generate         # generate migration files
pnpm db:studio           # open Drizzle Studio
npx tsc --noEmit         # type-check
```

No test framework is configured. If tests are added, prefer Vitest.

### Docker (shared)

```bash
docker compose up -d     # start PostgreSQL (creates both databases on first run)
docker compose down      # stop PostgreSQL
docker compose down -v   # stop + destroy volume (use make db-reset to also restart)
```

## Pre-commit Hooks

A Husky + lint-staged pre-commit hook runs automatically on `git commit`. It:

1. Runs `biome check --write` on staged `.ts`, `.tsx`, `.js`, `.jsx` files (lint + format)
2. Runs `biome format --write` on staged `.json` files

Only staged files are checked, so commits are fast. If Biome finds unfixable errors, the commit is blocked.

**Configuration lives in:**
- `.husky/pre-commit` — the hook script
- `package.json` (root) — `lint-staged` config
- `biome.json` (root) — shared Biome rules for both projects

**To skip the hook** (use sparingly): `git commit --no-verify`

## Environment Variables

- `agents/.env` — `DATABASE_URL` (points to `mastra` database) + API keys for model providers
- `next-app/.env` — `DATABASE_URL` (points to `betterauth` database) + Better Auth secrets + OAuth credentials

Both have `.env.example` files. Run `make setup` to copy them automatically.

Never commit `.env` files. They are gitignored.

## Frontend Route Structure (next-app)

The Next.js app uses **route groups** to provide different layouts for different sections:

```
src/app/
  layout.tsx              # root layout: html/body shell, ThemeProvider, Providers (no NavBar)
  globals.css             # Tailwind v4 + tw-animate-css, OKLCH theme, shimmer animation
  api/                    # API routes (auth, etc.)
  (auth)/                 # auth pages (sign-in, sign-up, reset-password) — no NavBar
    layout.tsx            # centered container + Toaster
  (main)/                 # main app pages — has NavBar
    layout.tsx            # NavBar + flex wrapper
    page.tsx              # home page
    account/
    admin/
    dashboard/
    pricing/
    payment/
    goodbye/
  (chat)/                 # chat interface — full-viewport, no NavBar
    layout.tsx            # ChatProviders (QueryClientProvider) + TooltipProvider
    chat/
      page.tsx
      assistant.tsx        # AssistantRuntimeProvider + SidebarProvider + Thread
      components/
        assistant-ui/      # thread, sidebar, markdown, reasoning, attachment, etc.
        tools/             # tool-specific UI (weather-tool-ui, etc.)
      lib/
        mastra-api.ts      # API client for Mastra backend
        mastra-thread-adapter.ts  # thread list + history adapters
        providers.tsx      # ChatProviders (chat-specific QueryClientProvider)
        query-client.ts    # singleton QueryClient for chat
      hooks/
        use-threads.ts     # TanStack Query hooks for threads
        use-messages.ts    # TanStack Query hooks for messages
```

**Key layout rules:**
- Route groups (`(main)`, `(chat)`, `(auth)`) don't affect URLs
- The root layout has NO NavBar — each route group adds its own chrome
- The `(chat)` layout uses a dedicated `QueryClient` singleton shared between React hooks and the thread adapter (both import from `chat/lib/query-client.ts`)
- Chat components use **relative imports** for files within `chat/` and `@/` aliases only for shared UI components (`@/components/ui/*`) and utilities (`@/lib/utils`)

## Code Style — agents

### Language & Module System
- TypeScript with `strict: true`, target ES2022, ESM (`"type": "module"`)
- Biome for linting and formatting (shared `biome.json` at repo root)

### Imports
- Named imports only — no default exports or imports
- Deep sub-path imports from `@mastra/core`: `@mastra/core/agent`, `@mastra/core/tools`, `@mastra/core/workflows`
- Relative paths for local imports (no path aliases, no `.js` extensions)
- Zod imported as `import { z } from 'zod'`

```typescript
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { weatherTool } from '../tools/weather-tool';
```

### Types & Schemas
- `interface` for API response shapes (PascalCase: `GeocodingResponse`, `WeatherResponse`)
- Zod schemas for runtime validation and type inference
- `as` type assertions on `fetch().json()` calls
- Inline type assertions for one-off response shapes; separate `interface` for reusable ones

### Naming Conventions
| Element              | Convention    | Examples                                    |
| -------------------- | ------------- | ------------------------------------------- |
| Variables/constants  | camelCase     | `weatherTool`, `forecastSchema`             |
| Interfaces           | PascalCase    | `WeatherResponse`                           |
| Functions            | camelCase     | `getWeather`, `getWeatherCondition`         |
| Tool/Agent/Workflow IDs | kebab-case (strings) | `'get-weather'`, `'weather-agent'` |
| Files                | kebab-case    | `weather-tool.ts`, `weather-agent.ts`       |

### Exports
- Named exports only (`export const`, `export { name }`)
- One primary resource per file (one agent, one tool, one workflow)
- Scorers may be grouped in a single file with individual + grouped exports

### Error Handling
- Fail-fast: throw `new Error('descriptive message')` with template literals
- No try/catch — errors bubble to the Mastra framework
- Guard clauses with optional chaining before throwing
- No custom error classes

### Patterns
- Factory functions: `createTool()`, `createStep()`, `createWorkflow()`, `new Agent()`
- Fluent chaining for workflows: `.then(step1).then(step2)` followed by `.commit()`
- Config via single options object — no positional arguments
- Module-private helpers (unexported functions)

## Code Style — next-app

### Language & Module System
- TypeScript with `strict: true`, JSX react-jsx, ESM
- ESLint + Prettier for linting and formatting
- Biome is used at the repo root level (pre-commit hooks)

### Imports
- Named imports predominant; `import type` for type-only imports
- Path alias `@/*` maps to `src/`: `@/lib/utils`, `@/components/ui/button`
- **Chat route exception:** files under `src/app/(chat)/chat/` use **relative imports** for other chat files and `@/` aliases only for shared components (`@/components/ui/*`, `@/lib/utils`)
- `import * as React from "react"` in shadcn/ui components
- `import { useState, memo } from "react"` in assistant-ui components
- Default imports only for Next.js conventions (`next/link`) and config files

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FC } from "react";
import { cva, type VariantProps } from "class-variance-authority";
```

### Component Patterns
- Arrow functions with `FC` type for assistant-ui components: `export const Thread: FC = () => {}`
- `function` declarations for shadcn/ui components: `function Button({ className, ...props }) {}`
- `"use client"` directive only on files that need browser APIs or hooks
- Props typed with `React.ComponentProps<"element">` and intersection types
- `cn()` utility (clsx + tailwind-merge) for all className composition
- `cva` for variant-based styling (buttons, sidebar items)
- `memo()` for performance-sensitive components; `forwardRef` only when needed

### Naming Conventions
| Element              | Convention      | Examples                                    |
| -------------------- | --------------- | ------------------------------------------- |
| Components           | PascalCase      | `Thread`, `ThreadWelcome`, `ToolFallback`   |
| Files                | kebab-case      | `thread-list.tsx`, `tooltip-icon-button.tsx` |
| Hooks                | camelCase       | `useSidebar`, `useIsMobile`                 |
| Hook files           | `use-*.ts`      | `use-mobile.ts`                             |
| Constants            | UPPER_SNAKE     | `MOBILE_BREAKPOINT`, `ANIMATION_DURATION`   |
| CSS variables        | kebab-case      | `--sidebar-width`, `--thread-max-width`     |

### Types
- `type` keyword preferred over `interface`
- `Readonly<{ children: React.ReactNode }>` for layout props
- `React.ComponentProps<"element">` for extending HTML element props
- `as unknown as` for attaching static properties to memo'd components

### Exports
- Named exports for components and utilities
- Default exports only for Next.js pages, layouts, and config files
- Multi-component files: single `export { A, B, C }` block at file bottom (shadcn/ui style)

### Styling
- Tailwind CSS v4 with `@import "tailwindcss"` and `@import "tw-animate-css"` syntax
- OKLCH color system with CSS custom properties for theming (light/dark)
- `data-slot` attributes on shadcn/ui components for external styling hooks
- Tailwind v4 features: container queries (`@container`), custom property functions (`w-(--sidebar-width)`)

### State Management
- React Context for sidebar state (hand-rolled provider + hook pattern)
- Zustand via `@assistant-ui/react` with `useShallow` for selector memoization
- assistant-ui runtime pattern: `useChatRuntime` + `AssistantRuntimeProvider`
- TanStack Query for server state (threads, messages) with chat-specific `QueryClient` singleton

### Authentication
- Better Auth with Drizzle adapter (`better-auth/adapters/drizzle`)
- Server-side: `auth.api.getSession()` with `headers()` from `next/headers`
- Client-side: `authClient.useSession()` from `@/lib/auth-client`
- Auth pages live in `(auth)/` route group (no NavBar)

## General Rules

1. Never commit secrets or `.env` files
2. Keep one primary resource per file in the backend
3. Use kebab-case for all filenames across both projects
4. Use kebab-case strings for Mastra resource IDs (tools, agents, workflows)
5. Prefer named exports; reserve default exports for Next.js pages/layouts/config
6. Use `cn()` for all Tailwind class merging in the frontend
7. Add `"use client"` only when a component uses hooks or browser APIs
8. Pre-commit hooks auto-run Biome on staged files; run `npx tsc --noEmit` in each project to verify types before committing
9. Chat route files use relative imports for intra-chat references; `@/` aliases only for shared UI
10. The chat route has its own `QueryClient` singleton — both React hooks and the thread adapter must use the same instance
11. After changing the database schema, run `make db-generate` then `make db-migrate`
12. After a fresh clone or `make db-reset`, run `make db-migrate` to set up the `betterauth` database tables
