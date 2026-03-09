# ──────────────────────────────────────────────────────────────
# Mastra Agent Stack — Local Development Makefile
# ──────────────────────────────────────────────────────────────
#
# Usage:
#   make install   — install all dependencies (root + backend + frontend)
#   make dev       — start everything (db, backend, frontend)
#   make stop      — tear down Docker services
#   make help      — show all available targets
# ──────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Directories
BACKEND  := mastra-backend
FRONTEND := next-frontend

# ──────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies (root, backend, frontend)
	npm install
	cd $(BACKEND) && npm install
	cd $(FRONTEND) && pnpm install

.PHONY: install-root
install-root: ## Install root dependencies only (Husky, lint-staged, Biome)
	npm install

.PHONY: install-backend
install-backend: ## Install backend dependencies only
	cd $(BACKEND) && npm install

.PHONY: install-frontend
install-frontend: ## Install frontend dependencies only
	cd $(FRONTEND) && pnpm install

.PHONY: setup
setup: install ## First-time setup: install deps + copy env files
	@[ -f $(FRONTEND)/.env ] || (cp $(FRONTEND)/.env.example $(FRONTEND)/.env && echo "Created $(FRONTEND)/.env — add your OPENAI_API_KEY")
	@[ -f $(BACKEND)/.env ] || echo "Note: create $(BACKEND)/.env with your model provider API keys"

# ──────────────────────────────────────────────────────────────
# Docker / Database
# ──────────────────────────────────────────────────────────────

.PHONY: db-up
db-up: ## Start PostgreSQL (Docker)
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

# ──────────────────────────────────────────────────────────────
# Development servers
# ──────────────────────────────────────────────────────────────

.PHONY: dev
dev: ## Start everything: database + backend + frontend (parallel)
	@$(MAKE) db-up
	@echo "Starting backend and frontend..."
	@trap 'kill 0' EXIT; \
		(cd $(BACKEND) && npm run dev) & \
		(cd $(FRONTEND) && pnpm dev) & \
		wait

.PHONY: dev-backend
dev-backend: ## Start backend only (Mastra Studio at localhost:4111)
	cd $(BACKEND) && npm run dev

.PHONY: dev-frontend
dev-frontend: ## Start frontend only (Next.js dev server)
	cd $(FRONTEND) && pnpm dev

.PHONY: stop
stop: db-down ## Stop all services (Docker)

# ──────────────────────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────────────────────

.PHONY: build
build: build-backend build-frontend ## Build both projects

.PHONY: build-backend
build-backend: ## Build backend (mastra build)
	cd $(BACKEND) && npm run build

.PHONY: build-frontend
build-frontend: ## Build frontend (next build)
	cd $(FRONTEND) && pnpm build

# ──────────────────────────────────────────────────────────────
# Lint / Format
# ──────────────────────────────────────────────────────────────

.PHONY: lint
lint: ## Lint entire repo (Biome check)
	npx biome check .

.PHONY: lint-fix
lint-fix: ## Lint + auto-fix entire repo
	npx biome check --write .

.PHONY: format
format: ## Check formatting across entire repo
	npx biome format .

.PHONY: format-fix
format-fix: ## Auto-format entire repo
	npx biome format --write .

# ──────────────────────────────────────────────────────────────
# Type checking
# ──────────────────────────────────────────────────────────────

.PHONY: typecheck
typecheck: typecheck-backend typecheck-frontend ## Type-check both projects

.PHONY: typecheck-backend
typecheck-backend: ## Type-check backend
	cd $(BACKEND) && npx tsc --noEmit

.PHONY: typecheck-frontend
typecheck-frontend: ## Type-check frontend
	cd $(FRONTEND) && npx tsc --noEmit

# ──────────────────────────────────────────────────────────────
# Quality (run before committing)
# ──────────────────────────────────────────────────────────────

.PHONY: check
check: lint typecheck ## Run all checks (lint + typecheck) — no auto-fix

.PHONY: fix
fix: lint-fix ## Auto-fix all lint/format issues

# ──────────────────────────────────────────────────────────────
# Clean
# ──────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf $(BACKEND)/dist $(BACKEND)/.mastra
	rm -rf $(FRONTEND)/.next $(FRONTEND)/out

.PHONY: clean-deps
clean-deps: ## Remove all node_modules directories
	rm -rf node_modules $(BACKEND)/node_modules $(FRONTEND)/node_modules

.PHONY: nuke
nuke: clean clean-deps db-down ## Full reset: clean + remove deps + stop Docker
	@echo "Run 'make setup' to start fresh"

# ──────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message
	@printf "\n\033[1mAvailable targets:\033[0m\n\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@printf "\n"
