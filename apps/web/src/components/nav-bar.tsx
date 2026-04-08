import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import AvatarDropdown from "@/components/avatar-dropdown";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import type { Session } from "@/lib/types";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/agents", label: "Agents" },
  { href: "/workflows", label: "Workflows" },
  { href: "/pricing", label: "Pricing" },
];

export default async function NavBar() {
  const session: Session | null = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch((e) => {
      console.error(e);
      return null;
    });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="flex h-14 w-full items-center px-4">
        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-4">
          {session ? (
            <Suspense fallback={<div className="h-8 w-8 animate-pulse rounded-full bg-muted" />}>
              <AvatarDropdown session={JSON.parse(JSON.stringify(session))} />
            </Suspense>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium transition outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            >
              Sign In
            </Link>
          )}
          <ModeToggle />
          {/* Mobile menu */}
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
