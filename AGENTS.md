# AGENTS.md

Guidance for AI coding agents working in this monorepo.

## Repository Structure

pnpm workspace monorepo with Turborepo for task orchestration. Package manager: **pnpm**.

| Directory               | Package               | Description                                 | Runtime       |
| ----------------------- | --------------------- | ------------------------------------------- | ------------- |
| `apps/agents/`          | `@repo/agents`        | Mastra AI agent backend (TypeScript, ESM)   | Node >= 22.13 |
| `apps/web/`             | `@repo/web`           | Next.js 16 + assistant-ui chat (React 19)   | Node >= 18    |
| `packages/shared-types/`| `@repo/shared-types`  | Shared TypeScript types and constants       | —             |

Root `docker-compose.yml` runs PostgreSQL 16 (`localhost:5432`, `user`/`password`) with two databases: `mastra` (agents) and `betterauth` (web). Root `Makefile` has shortcuts — run `make help`.

## Commands

### Root (workspace-level)

```bash
pnpm install          # install all deps (single lockfile)
pnpm turbo run build  # build all projects (cached)
pnpm turbo run typecheck  # type-check all projects (cached)
pnpm biome check .    # lint entire repo
```

### apps/agents/

```bash
pnpm dev              # Mastra Studio at localhost:4111
pnpm build            # production build (mastra build)
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
pnpm typecheck        # tsc --noEmit
```

No test framework configured. If added, use Vitest with ESM.

Mastra structure: `src/mastra/` entry point. Subdirs: `agents/`, `tools/`, `workflows/`, `scorers/`, `mcp/`.

### apps/web/

```bash
pnpm dev              # Next.js dev server (Turbopack)
pnpm build            # production build
pnpm lint             # biome check .
pnpm lint:fix         # biome check --write .
pnpm typecheck        # tsc --noEmit
pnpm db:migrate       # run Drizzle migrations
pnpm db:push          # push schema to database
pnpm db:generate      # generate migration files
```

No test framework configured. If added, use Vitest.

### Key Makefile shortcuts

```bash
make setup            # first-time: install all deps + copy .env files
make dev              # start db + backend + frontend
make check            # lint + typecheck (pre-commit sanity check)
make lint-fix         # auto-fix lint/format across repo
make db-reset         # destroy + restart PostgreSQL
```

### Pre-commit & Environment

Husky + lint-staged runs `biome check --write` on staged `.ts/.tsx/.js/.jsx` and `biome format --write` on `.json`. Skip: `git commit --no-verify`.

Environment: `apps/agents/.env` and `apps/web/.env` (both have `.env.example`). Never commit `.env` files.

## Formatting (Biome — shared root config)

`biome.json`: 2-space indent, double quotes, semicolons always, line width 100. Auto-organizes imports. Key lint rules: `noUnusedImports` (warn), `noExplicitAny` (warn).

Biome is the sole linter/formatter for both projects. No ESLint or Prettier.

## Shared Types (`packages/shared-types/`)

The `@repo/shared-types` package contains TypeScript interfaces and constants shared between apps:

- `WeatherResult` — output shape of the get-weather tool
- `MastraThread`, `MastraThreadListResponse` — Mastra Memory API response types
- `AGENT_IDS` — canonical agent ID strings

Import from `@repo/shared-types` in either app. The package uses `workspace:*` protocol — no publishing needed.

## Code Style — apps/agents/

TypeScript `strict: true`, target ES2022, ESM (`"type": "module"`).

**Imports:** Named only — no default exports/imports. Deep sub-path imports from `@mastra/core` (`@mastra/core/agent`, `@mastra/core/tools`). Relative paths for local imports (no aliases, no `.js` extensions).

```typescript
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { weatherTool } from "../tools/weather-tool";
```

| Element            | Convention             | Examples                                 |
| ------------------ | ---------------------- | ---------------------------------------- |
| Files              | kebab-case             | `weather-tool.ts`, `weather-agent.ts`    |
| Variables/funcs    | camelCase              | `weatherTool`, `getWeather`              |
| Interfaces         | PascalCase             | `WeatherResponse`, `GeocodingResponse`   |
| Resource IDs       | `'kebab-case'` strings | `'get-weather'`, `'weather-agent'`       |

**Exports:** Named only. One primary resource per file (one agent, one tool, one workflow).

**Types:** `interface` for API response shapes. Zod schemas for runtime validation. `as` assertions on `fetch().json()`.

**Error handling:** Fail-fast with `throw new Error('message')`. No try/catch — errors bubble to Mastra. Guard clauses with optional chaining. No custom error classes.

**Patterns:** Factory functions (`createTool()`, `createStep()`, `new Agent()`). Fluent workflow chaining (`.then().then().commit()`). Config via single options object.

## Code Style — apps/web/

TypeScript `strict: true`, JSX react-jsx. Biome for linting/formatting.

**Imports:** `import type` for type-only. Path alias `@/*` maps to `src/`. **Chat route exception:** files under `src/app/(chat)/chat/` use relative imports internally; `@/` only for shared UI (`@/components/ui/*`, `@/lib/utils`).

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FC } from "react";
```

| Element    | Convention   | Examples                                  |
| ---------- | ------------ | ----------------------------------------- |
| Components | PascalCase   | `Thread`, `ThreadWelcome`, `ToolFallback` |
| Files      | kebab-case   | `thread-list.tsx`, `use-mobile.ts`        |
| Hooks      | camelCase    | `useSidebar`, `useIsMobile`               |
| Constants  | UPPER_SNAKE  | `MOBILE_BREAKPOINT`                       |

**Components:** Arrow + `FC` for assistant-ui. `function` declarations for shadcn/ui. `"use client"` only when hooks/browser APIs needed. `cn()` for all className merging. `cva` for variants.

**Types:** `type` preferred over `interface`. `Readonly<{ children: React.ReactNode }>` for layouts. `React.ComponentProps<"element">` for extending HTML props.

**Exports:** Named for components/utilities. Default only for Next.js pages, layouts, config.

## Known Issues

### Thread ID Race Condition (assistant-ui + Mastra Memory)

**Files:** `apps/web/src/app/(chat)/chat/lib/mastra-thread-adapter.ts`, `apps/web/src/app/(chat)/chat/assistant.tsx`

When using `assistant-ui`'s `unstable_useRemoteThreadListRuntime` with Mastra Memory, a race condition during new thread creation causes duplicate threads with `__LOCALID_*` IDs in the database.

**Root cause:** `assistant-ui` generates temporary local IDs before server persistence. `AssistantChatTransport` relies on `this.runtime` (set via React effect after render). On first message send it's `undefined`, so `initialize()` resolves immediately and `prepareSendMessagesRequest` fires before `createThread()` completes, sending the raw `__LOCALID_*` to Mastra. Memory auto-creates a thread for unknown IDs, resulting in two threads per conversation.

**How the fix works (do not remove or simplify):**

1. `mastra-thread-adapter.ts` stores pending init promises in a module-level `pendingInits` Map, keyed by local ID.
2. `assistant.tsx` uses `resolveThreadIdAsync()` in `prepareSendMessagesRequest` — awaits the pending promise to guarantee the UUID is available.
3. `id: options.id` is deliberately omitted from the request body — it's always the `__LOCALID_*` placeholder.
4. `initialize()` is guarded against repeated calls via both `threadIdMap` (completed) and `pendingInits` (in-flight).

**If `__LOCALID_*` threads appear in the database**, check that:
- `prepareSendMessagesRequest` uses `await resolveThreadIdAsync(threadId)`, not `resolveThreadId(threadId)`
- The request body does NOT include `id: options.id`
- `initialize()` stores its promise in `pendingInits` before awaiting

## General Rules

1. Never commit secrets or `.env` files
2. One primary resource per file in the backend
3. kebab-case for all filenames; kebab-case strings for Mastra resource IDs
4. Prefer named exports; default exports only for Next.js pages/layouts/config
5. `cn()` for all Tailwind class merging in the frontend
6. `"use client"` only when a component uses hooks or browser APIs
7. Run `make typecheck` to verify types before committing (uses turbo caching)
8. Chat route: relative imports internally, `@/` aliases only for shared UI
9. Chat route has its own `QueryClient` singleton — hooks and thread adapter must share it
10. After schema changes: `make db-generate` then `make db-migrate`
11. After fresh clone or `make db-reset`: run `make db-migrate`
12. Shared types go in `packages/shared-types/` — both apps import from `@repo/shared-types`
