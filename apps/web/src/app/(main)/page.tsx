import { CreditCard, Database, Lock, Palette, Server, Shield, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function Home() {
  return (
    <div className="relative">
      {/* Grid Background */}
      <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 h-[600px]" />

      <div className="relative container mx-auto px-4 py-16">
        {/* Hero Section */}
        <section className="py-16 text-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Build Production-Ready
              <br />
              <span className="text-muted-foreground">Next.js Applications</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
              A complete starter template with authentication, payments, and database — all wired up
              and ready to deploy. Stop boilerplating. Start building.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button>
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button variant="outline">
                <Link href="https://github.com/your-repo/better-starter" target="_blank">
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Core Value Props */}
        <section className="py-16">
          <div className="mb-10 flex items-center justify-center gap-4">
            <div className="h-px max-w-24 flex-1 bg-border" />
            <h2 className="text-md font-medium">From Idea to Production</h2>
            <div className="h-px max-w-24 flex-1 bg-border" />
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Authenticate</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Better Auth with email/password and Google OAuth out of the box. User sessions,
                account management, and admin controls — all ready to go.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Monetize</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Built-in Polar.sh integration for subscriptions and payments. Start charging for
                your product from day one.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Ship Fast</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Docker-ready with CI/CD, Drizzle migrations, and Dokploy deployment. Go from git
                push to production in minutes.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="mb-10 flex items-center justify-center gap-4">
            <div className="h-px max-w-24 flex-1 bg-border" />
            <h2 className="text-md font-medium">What&apos;s Included</h2>
            <div className="h-px max-w-24 flex-1 bg-border" />
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Better Auth</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Email/password and Google OAuth with JWT sessions, admin plugin, and route
                protection middleware.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Drizzle ORM</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Type-safe PostgreSQL with schema definitions, migrations, and Drizzle Studio for
                database management.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Polar.sh Payments</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Subscription management and payment processing integrated directly into your auth
                flow.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">shadcn/ui + Tailwind</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Beautiful, accessible components with Tailwind CSS v4, dark mode, and consistent
                design tokens.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">React Query</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Server state management with caching, background refetching, and optimistic updates
                built in.
              </p>
            </div>
            <div className="rounded-lg border border-border p-6">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                <span className="font-medium">Docker + Dokploy</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Standalone Docker builds with environment variable injection and self-hosted PaaS
                deployment.
              </p>
            </div>
          </div>
        </section>

        {/* Deployment Section */}
        <section className="py-16">
          <div className="mb-10 flex items-center justify-center gap-4">
            <div className="h-px max-w-24 flex-1 bg-border" />
            <h2 className="text-md font-medium">Deploy Your Way</h2>
            <div className="h-px max-w-24 flex-1 bg-border" />
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-border p-6">
              <span className="font-medium">Docker Compose</span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Local, staging, and production environments with Traefik and CrowdSec security.
              </p>
              <div className="mt-4 space-y-2">
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  docker-compose.local.yml
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  docker-compose.staging.yml
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  docker-compose.production.yml
                </code>
              </div>
            </div>
            <div className="rounded-lg border border-border p-6">
              <span className="font-medium">Dokploy</span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Self-hosted PaaS deployment with automatic builds and runtime environment
                configuration.
              </p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">1.</span> Push to repository
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">2.</span> Dokploy builds image
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">3.</span> Deploy with env vars
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-6">
              <span className="font-medium">GitHub Actions</span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Automated CI/CD with PR validation, staging builds, and production deployments to
                GHCR.
              </p>
              <div className="mt-4 space-y-2">
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  PR triggers validation
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  staging-* tag validates
                </code>
                <code className="block rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  v* tag deploys
                </code>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
