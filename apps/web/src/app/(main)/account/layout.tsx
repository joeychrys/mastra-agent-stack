"use client";

import { Landmark, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 border-b pb-6 md:w-56 md:border-r md:border-b-0 md:pr-6 md:pb-0">
          <div className="mb-6">
            <h1 className="text-lg font-medium tracking-tight">Account</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Manage your account info.
            </p>
          </div>
          <AccountNav />
        </aside>
        <main className="w-full flex-1 md:pl-8">
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
        active={pathname === "/account/profile"}
        icon={<User className="mr-2 h-4 w-4" />}
      >
        Profile
      </NavItem>
      <NavItem
        href="/account/security"
        active={pathname === "/account/security"}
        icon={<Shield className="mr-2 h-4 w-4" />}
      >
        Security
      </NavItem>
      <NavItem
        href="/account/billing"
        active={pathname === "/account/billing"}
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
      className={`flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
