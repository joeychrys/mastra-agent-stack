# AGENTS.md

Guidance for AI coding agents working in this monorepo.

## Repository Structure

pnpm workspace monorepo with Turborepo for task orchestration. Package manager: **pnpm**.

| Directory               | Package               | Description                                 | Runtime       |
| ----------------------- | --------------------- | ------------------------------------------- | ------------- |
| `apps/agents/`          | `@repo/agents`        | Mastra AI agent backend (TypeScript, ESM)   | Node >= 22.13 |
| `apps/web/`             | `@repo/web`           | Next.js 16 + assistant-ui chat (React 19)   | Node >= 18    |
| `packages/aui-mastra/`  | `@repo/aui-mastra`    | assistant-ui ↔ Mastra runtime glue (threads, memory) | —    |

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
pnpm db:migrate       # run Drizzle migrations (local, reads .env)
pnpm db:push          # push schema to database (local only — never prod)
pnpm db:generate      # generate migration files
pnpm db:migrate:prod  # run migrations against prod over Tailscale (reads .env.production)
pnpm db:studio:prod   # open Drizzle Studio against prod over Tailscale
```

No test framework configured. If added, use Vitest.

### Key Makefile shortcuts

```bash
make install          # install all dependencies
make dev              # start db + backend + frontend
make check            # lint + typecheck (pre-commit sanity check)
make fix              # auto-fix lint/format across repo
make db-reset         # destroy + restart PostgreSQL
make auth-db action=migrate env=local  # migrate the betterauth DB schema (local)
make auth-db action=migrate env=prod   # migrate betterauth DB on prod over Tailscale
make auth-db action=studio  env=prod   # open Drizzle Studio against prod
```

The `auth-db` target manages the `betterauth` database schema (Drizzle, in
`apps/web`) and **requires** both `action=migrate|generate|push|studio` and
`env=local|prod` (no defaults). The `mastra` database is managed by Mastra, not
Drizzle. Against `env=prod`, only `migrate`/`studio` are permitted (needs
`apps/web/.env.prod-db`).

### Production Database Migrations

The production web image (`apps/web/Dockerfile`) ships **no** migration tooling —
it is a pure Next.js runtime artifact. Do not add `drizzle-kit`/`pnpm`/`npm`
install steps back into it. Migrations are applied from a trusted operator machine
that reaches the prod database over Tailscale, reusing the `drizzle-kit` already in
`apps/web`:

```bash
cp apps/web/.env.prod-db.example apps/web/.env.prod-db  # one-time; gitignored
make auth-db action=migrate env=prod   # or: pnpm --filter @repo/web db:migrate:prod
```

The prod env file is deliberately **not** named `.env.production` — Next.js
auto-loads that filename during `next build`, which would point local production
builds at the prod database.

**Guardrail:** against prod use `db:migrate` only (versioned SQL from
`apps/web/src/drizzle/`). **Never `db:push` against prod** — it diffs the schema
directly and can drop/alter without a migration file. Migrate before deploying an
image that expects the new schema. See "Production Database Migrations" in the
root `README.md` for the full workflow.

### Pre-commit & Environment

Husky + lint-staged runs `biome check --write` on staged `.ts/.tsx/.js/.jsx` and `biome format --write` on `.json`. Skip: `git commit --no-verify`.

Environment: `apps/agents/.env` and `apps/web/.env` (both have `.env.example` — copy manually). Never commit `.env` files.

## Formatting (Biome — shared root config)

`biome.json`: 2-space indent, double quotes, semicolons always, line width 100. Auto-organizes imports. Key lint rules: `noUnusedImports` (warn), `noExplicitAny` (warn).

Biome is the sole linter/formatter for both projects. No ESLint or Prettier.

## Cross-App Contracts (no shared types package)

There is deliberately **no** shared-types package. The Mastra API is the contract between the apps:

- **Structure/config data** (workflows, steps, schemas, agent lists) is fetched at runtime from the Mastra REST API (`GET /api/workflows/:id`, `GET /api/agents`, ...). The workflow UI under `apps/web/src/app/(workflow)/` is the reference pattern.
- **Workflow routes are explicit and self-contained.** Each `workflows/<workflow-id>/` folder owns a `config.ts` (static data — ids, copy, `stepWidths`, and a **required** `canvas`) and a `page.tsx` that spreads that config into `WorkflowRunner` and supplies `renderInput` / `renderStep`; colocate custom components in the same folder. Config files are `.ts`, never `.tsx`, so components can never leak into config — anything returning JSX belongs in `page.tsx`. Without `renderInput`, the input node is a disabled JSON placeholder so missing page UI is visible. Returning `undefined` from `renderStep` uses the raw-JSON fallback. Workflow hooks live under `(workflow)/hooks/`. The workflow listing is intentionally hardcoded, and there is no dynamic catch-all workflow route.
- **Canvas sizing/spacing is declared per page, not globally.** `(workflow)/lib/graph-config.ts` exports the `CanvasConfig` type plus non-tunable internals (`INPUT_NODE_ID`, `CENTER_X`, `FALLBACK_NODE_HEIGHT`, `HANDLE_CLASS`) — deliberately **no default values**, so every page states its own canvas and TypeScript fails the build if one is missing. Node width is always an explicit number (never content-derived): the graph resolves `stepWidths[stepId] ?? canvas.nodeWidth` and passes it to the node shell. Copy this block when adding a workflow:

```ts
canvas: {
  nodeWidth: 300,
  nodeSpacingX: 40, // horizontal gap within a row
  rowSpacingY: 50,  // vertical gap between rows
  fitViewPadding: 0.3,
  fitViewMaxZoom: 0.8,
  minZoom: 0.2,
  nodesDraggable: false,
},
```
- **Presentation types** for tool/step outputs are owned by the component that renders them (e.g. `WeatherResult` in `weather-tool-ui.tsx`), with defensive runtime guards since results arrive as untyped JSON.
- **Agent references always use the agent `id`** (e.g. `"weather-agent"`, as listed by `GET /api/agents`) — never the Mastra registration map key (e.g. `weatherAgent`). Backend lookups use `mastra.getAgentById("agent-id")`, not `mastra.getAgent(mapKey)`.

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

**Imports:** `import type` for type-only. Path alias `@/*` maps to `src/`. **Chat route exception:** files under `src/app/(chat)/` use relative imports internally; `@/` only for shared UI (`@/components/ui/*`, `@/lib/utils`).

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

**File:** `packages/aui-mastra/src/useMastraThreadListRuntime.ts` (the fix originated in the old `(chat)/chat` route and now lives entirely in this package)

When using `assistant-ui`'s `unstable_useRemoteThreadListRuntime` with Mastra Memory, a race condition during new thread creation causes duplicate threads with `__LOCALID_*` IDs in the database.

**Root cause:** `assistant-ui` generates temporary local IDs before server persistence. `AssistantChatTransport` relies on `this.runtime` (set via React effect after render). On first message send it's `undefined`, so `initialize()` resolves immediately and `prepareSendMessagesRequest` fires before `createThread()` completes, sending the raw `__LOCALID_*` to Mastra. Memory auto-creates a thread for unknown IDs, resulting in two threads per conversation.

**Current composition:** the per-thread runtime is assistant-ui's `useChatRuntime` (from `@assistant-ui/ai-sdk`), nested inside the package's `useRemoteThreadListRuntime` (it becomes a no-op list via `allowNesting`). `useChatRuntime` wires the transport to the runtime and the current thread list item, so the transport itself awaits `threadListItem.initialize()` before `prepareSendMessagesRequest`. The guards below are **retained as defense in depth** — removing them requires replacing this invariant deliberately, with race tests (slow/concurrent/failed initialization, switching threads mid-creation).

**How the fix works (do not remove or simplify):**

1. Pending init promises are stored in a `pendingInits` Map (a `useRef` in the hook), keyed by local ID.
2. `prepareSendMessagesRequest` awaits `resolveThreadIdAsync()` — guaranteeing the server UUID is available before the request fires (it starts `threadListItem.initialize()` itself if nothing is in flight, and refuses to send a local ID).
3. `id: options.id` is deliberately omitted from the request body — for new threads it originates as the `__LOCALID_*` placeholder; Mastra receives the thread only via `memory.thread`.
4. `initialize()` is guarded against repeated calls via both `threadIdMap` (completed) and `pendingInits` (in-flight).

History loading reads the thread list item's `remoteId` lazily at load time (`createHistoryAdapter({ threadId: () => ... })`), so a new thread's `__LOCALID_*` placeholder never reaches the memory API.

**If `__LOCALID_*` threads appear in the database**, check those four properties still hold in `useMastraThreadListRuntime.ts`.

## General Rules

1. Never commit secrets or `.env` files
2. One primary resource per file in the backend
3. kebab-case for all filenames; kebab-case strings for Mastra resource IDs
4. Prefer named exports; default exports only for Next.js pages/layouts/config
5. `cn()` for all Tailwind class merging in the frontend
6. `"use client"` only when a component uses hooks or browser APIs
7. Run `make typecheck` to verify types before committing (uses turbo caching)
8. Chat route: relative imports internally, `@/` aliases only for shared UI
9. The Mastra auth-token cache uses the `queryClient` singleton in `(chat)/lib/query-client.ts` — `getAuthToken()` and `useAuthToken()` both bind to it explicitly (no route-level `QueryClientProvider`), so they always share one cache. Register tool-call renderers as toolkits via `AuiConfig({ tools: Tools({ toolkit }) })` on `AssistantRuntimeProvider`'s `config`, not with the deprecated `makeAssistantToolUI` components
10. After schema changes: `make auth-db action=generate env=local` then `make auth-db action=migrate env=local`
11. After fresh clone or `make db-reset`: run `make auth-db action=migrate env=local`
12. Prod migrations run from a Tailscale-connected operator machine via `make auth-db action=migrate env=prod` (reads gitignored `apps/web/.env.prod-db`) — never bundle migration tooling into the web image, and never `db:push` against prod
13. No shared-types package: contract data comes from the Mastra API at runtime; presentation types are owned by the rendering component. Always reference agents by their `id` (`"weather-agent"`), never the registration map key (`weatherAgent`) — backend lookups use `mastra.getAgentById()`
14. All agents must be registered in the Mastra `agents` map (`src/mastra/index.ts`) and retrieved via `mastra.getAgent()` in workflow steps — local agents created with `new Agent()` inline bypass the observability pipeline and will not appear in the usage logger or any span output processors
