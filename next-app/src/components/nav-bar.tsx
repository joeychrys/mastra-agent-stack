import { headers } from 'next/headers';
import Link from 'next/link';
import { Suspense } from 'react';

import AvatarDropdown from '@/components/avatar-dropdown';
import { MobileNav } from '@/components/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { Session } from '@/lib/types';

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
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Mobile menu */}
        <MobileNav />

        {/* Desktop navigation */}
        <nav className="hidden items-center space-x-6 text-sm md:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {session ? (
            <Suspense fallback={<div className="bg-muted h-8 w-8 animate-pulse rounded-full" />}>
              <AvatarDropdown session={JSON.parse(JSON.stringify(session))} />
            </Suspense>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
