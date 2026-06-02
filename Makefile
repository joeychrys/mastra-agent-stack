# ──────────────────────────────────────────────────────────────
# Mastra Agent Stack — Local Development Makefile
# ──────────────────────────────────────────────────────────────
#
# Usage:
#   make install          — install all dependencies
#   make dev              — start everything (db, backend, frontend)
#   make dev app=web      — start a single app (web|agents)
#   make auth-db action=migrate env=prod  — manage the betterauth DB schema
#   make check            — lint + typecheck before committing
#   make help             — show all available targets
#
# Parameterized targets:
#   build/typecheck/dev   accept app=web|agents (omit to run across the workspace)
#   auth-db               accepts action=migrate|generate|push|studio and env=local|prod
# ──────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Directories
BACKEND  := apps/agents
FRONTEND := apps/web

# Optional app scope: `app=web` → @repo/web / apps/web, `app=agents` → @repo/agents / apps/agents
filter := $(if $(app),--filter=@repo/$(app))

# ──────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies (single workspace install)
	pnpm install

# ──────────────────────────────────────────────────────────────
# Database (Docker + Drizzle)
# ──────────────────────────────────────────────────────────────

.PHONY: db
db: ## Start PostgreSQL (Docker) — see db-down, db-reset, db-logs
	docker compose up -d

.PHONY: db-down
db-down: ## Stop PostgreSQL (Docker)
	docker compose down

.PHONY: db-reset
db-reset: ## Reset PostgreSQL (destroy volume and restart)
	docker compose down -v
	docker compose up -d

.PHONY: db-logs
db-logs: ## Tail PostgreSQL logs
	docker compose logs -f postgres

# Manage the betterauth database schema (Drizzle, lives in apps/web).
#   action = migrate | generate | push | studio   (REQUIRED)
#   env    = local | prod                          (REQUIRED; prod runs over
#            Tailscale and needs deploy/db/.env.production)
# Examples:
#   make auth-db action=migrate  env=local         # apply migrations locally
#   make auth-db action=generate env=local         # generate migration files
#   make auth-db action=studio   env=prod          # open Drizzle Studio against prod
#
# Both params are required (no defaults) and validated at parse time. Against
# prod only migrate/studio are allowed — push/generate diff/alter the live
# schema directly and must never run against production.
ifeq ($(MAKECMDGOALS),auth-db)
ifndef action
$(error auth-db requires action=migrate|generate|push|studio and env=local|prod)
endif
ifndef env
$(error auth-db requires env=local|prod (and action=migrate|generate|push|studio))
endif
ifeq ($(filter $(action),migrate generate push studio),)
$(error invalid action='$(action)' — must be one of migrate|generate|push|studio)
endif
ifeq ($(filter $(env),local prod),)
$(error invalid env='$(env)' — must be local or prod)
endif
ifeq ($(env),prod)
ifeq ($(filter $(action),migrate studio),)
$(error against prod only action=migrate|studio is allowed (got '$(action)') — push/generate must never run against production)
endif
endif
endif

.PHONY: auth-db
auth-db: ## Manage betterauth DB schema (action=migrate|generate|push|studio env=local|prod — both required)
ifeq ($(env),prod)
	cd $(FRONTEND) && pnpm db:$(action):prod
else
	cd $(FRONTEND) && pnpm db:$(action)
endif

# ──────────────────────────────────────────────────────────────
# Development
# ──────────────────────────────────────────────────────────────

.PHONY: dev
dev: ## Start db + backend + frontend (or one app: make dev app=web|agents)
ifdef app
	cd apps/$(app) && pnpm dev
else
	@$(MAKE) db
	@echo "Starting backend and frontend..."
	@trap 'kill 0' EXIT; \
		(cd $(BACKEND) && pnpm dev) & \
		(cd $(FRONTEND) && pnpm dev) & \
		wait
endif

.PHONY: stop
stop: db-down ## Stop all services (Docker)

# ──────────────────────────────────────────────────────────────
# Build / Quality (Turborepo + Biome)
# ──────────────────────────────────────────────────────────────

.PHONY: build
build: ## Build all projects, or one: make build app=web|agents (turbo, cached)
	pnpm turbo run build $(filter)

.PHONY: typecheck
typecheck: ## Type-check all projects, or one: make typecheck app=web|agents (turbo)
	pnpm turbo run typecheck $(filter)

.PHONY: lint
lint: ## Lint + format check across the repo (Biome)
	pnpm biome check .

.PHONY: check
check: lint typecheck ## Run all checks (lint + typecheck) — no auto-fix

.PHONY: fix
fix: ## Auto-fix lint + format issues across the repo (Biome)
	pnpm biome check --write .

# ──────────────────────────────────────────────────────────────
# Clean
# ──────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf $(BACKEND)/dist $(BACKEND)/.mastra
	rm -rf $(FRONTEND)/.next $(FRONTEND)/out
	rm -rf .turbo apps/*/.turbo packages/*/.turbo

.PHONY: nuke
nuke: clean db-down ## Full reset: clean + remove all node_modules + stop Docker
	rm -rf node_modules $(BACKEND)/node_modules $(FRONTEND)/node_modules packages/*/node_modules
	@echo "Run 'make install' to start fresh"

# ──────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message
	@printf "\n\033[1mAvailable targets:\033[0m\n\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@printf "\n  Tips: scope build/typecheck/dev with app=web|agents\n"
	@printf "        manage the auth DB with auth-db action=migrate|generate|push|studio env=local|prod\n\n"
