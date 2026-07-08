# Production `betterauth` Database Migrations

This covers the **`betterauth`** database (user auth/sessions), the only database
managed by Drizzle. The `mastra` agent database is managed by Mastra itself, not
here.

The production web image (`apps/web/Dockerfile`) ships **no** migration tooling —
it is a pure Next.js runtime artifact. Migrations are applied from a trusted
operator machine that reaches the production database over
[Tailscale](https://tailscale.com), reusing the `drizzle-kit` toolchain already
present in `apps/web`.

## One-time setup

Copy the template and fill in the production connection string (use the database
host's Tailscale name or `100.x.y.z` IP):

```bash
cp deploy/db/.env.production.example deploy/db/.env.production
# edit deploy/db/.env.production → set DATABASE_URL
```

`deploy/db/.env.production` is gitignored (`**/.env.production`) — never commit it.

## Applying migrations / browsing the database

With Tailscale connected:

```bash
make auth-db action=migrate env=prod   # apply versioned migrations to prod
make auth-db action=studio  env=prod   # open Drizzle Studio (https://local.drizzle.studio)
```

These map to `pnpm --filter @repo/web db:migrate:prod` / `db:studio:prod`, which
load `deploy/db/.env.production` and run `drizzle-kit` with `apps/web` as the
working directory (where `drizzle.config.ts`, the schema, and the versioned SQL in
`src/drizzle/` live).

## Guardrail

Against production only `migrate`/`studio` are permitted — the `auth-db` target
refuses `push`/`generate` when `env=prod`. `migrate` applies the reviewed,
versioned SQL files in `apps/web/src/drizzle/`. **Never run `db:push` against
production**: it diffs the schema directly against the live database and can drop
or alter columns without a migration file.

Run migrations **before** deploying an image that expects the new schema.
