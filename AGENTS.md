# AGENTS.md

Guidance for AI coding agents working in this monorepo.

## Repository Structure

This is a two-project monorepo (no workspace manager — each project has independent dependencies):

| Directory          | Description                                      | Runtime       |
| ------------------ | ------------------------------------------------ | ------------- |
| `mastra-backend/`  | Mastra AI agent framework backend (TypeScript)   | Node >= 22.13 |
| `next-frontend/`   | Next.js 16 chat UI with assistant-ui (React 19)  | Node >= 18    |

A root `docker-compose.yml` provides a local PostgreSQL 16 instance (`localhost:5432`, user/password/db: `user`/`password`/`betterstarter`).

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

### mastra-backend

```bash
cd mastra-backend
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

### next-frontend

```bash
cd next-frontend
pnpm install             # install dependencies (uses pnpm)
pnpm dev                 # dev server with Turbopack
pnpm build               # production build
pnpm start               # start production server
pnpm lint                # lint all files (biome check .)
pnpm lint:fix            # lint and auto-fix (biome check --write .)
pnpm format              # check formatting (biome format .)
pnpm format:fix          # auto-format (biome format --write .)
npx tsc --noEmit         # type-check
```

No test framework is configured. If tests are added, prefer Vitest.

### Docker (shared)

```bash
docker compose up -d     # start PostgreSQL
docker compose down      # stop PostgreSQL
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

- `mastra-backend/.env` — `DATABASE_URL` (PostgreSQL connection string) + API keys for model providers
- `next-frontend/.env` — copy from `.env.example`; requires `OPENAI_API_KEY`

Never commit `.env` files. They are gitignored.

## Code Style — mastra-backend

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

## Code Style — next-frontend

### Language & Module System
- TypeScript with `strict: true`, JSX react-jsx, ESM
- Biome for linting and formatting (no ESLint or Prettier)

### Imports
- Named imports predominant; `import type` for type-only imports
- Path alias `@/*` maps to project root: `@/lib/utils`, `@/components/ui/button`
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
- Tailwind CSS v4 with `@import "tailwindcss"` syntax
- OKLCH color system with CSS custom properties for theming (light/dark)
- `data-slot` attributes on shadcn/ui components for external styling hooks
- Tailwind v4 features: container queries (`@container`), custom property functions (`w-(--sidebar-width)`)

### State Management
- React Context for sidebar state (hand-rolled provider + hook pattern)
- Zustand via `@assistant-ui/react` with `useShallow` for selector memoization
- assistant-ui runtime pattern: `useChatRuntime` + `AssistantRuntimeProvider`

## General Rules

1. Never commit secrets or `.env` files
2. Keep one primary resource per file in the backend
3. Use kebab-case for all filenames across both projects
4. Use kebab-case strings for Mastra resource IDs (tools, agents, workflows)
5. Prefer named exports; reserve default exports for Next.js pages/layouts/config
6. Use `cn()` for all Tailwind class merging in the frontend
7. Add `"use client"` only when a component uses hooks or browser APIs
8. Pre-commit hooks auto-run Biome on staged files; run `npx tsc --noEmit` in each project to verify types before committing
