'use client';

import { Shield, User, Landmark } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-6xl p-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 border-b md:w-64 md:border-r md:border-b-0 md:pr-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Account</h1>
            <p className="text-muted-foreground text-sm">Manage your account info.</p>
          </div>
          <AccountNav />
        </aside>
        <main className="mx-auto w-full max-w-3xl flex-1 md:pl-6">
          {children}
          <Toaster />
        </main>
      </div>
    </div>
  );
}

function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 pb-6 md:pb-0">
      <NavItem
        href="/account/profile"
        active={pathname === '/account/profile'}
        icon={<User className="mr-2 h-4 w-4" />}
      >
        Profile
      </NavItem>
      <NavItem
        href="/account/security"
        active={pathname === '/account/security'}
        icon={<Shield className="mr-2 h-4 w-4" />}
      >
        Security
      </NavItem>
      <NavItem
        href="/account/billing"
        active={pathname === '/account/billing'}
        icon={<Landmark className="mr-2 h-4 w-4" />}
      >
        Billing
      </NavItem>
    </nav>
  );
}

interface NavItemProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

function NavItem({ href, active, children, icon }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm ${
        active
          ? 'bg-muted font-medium'
          : 'text-muted-foreground hover:text-black dark:hover:text-white'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
