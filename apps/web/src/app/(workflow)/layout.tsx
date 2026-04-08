"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { authClient } from "@/lib/auth-client";

/** Derives a readable page title from a URL segment (e.g. "activity-planner" → "Activity Planner"). */
function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function WorkflowLayout({ children }: { children: ReactNode }) {
  // Mount the Better Auth session atom so the client-side session state is
  // established before any authClient.token() calls.  Without this, token
  // requests on page refresh return 401 because the session refresh manager
  // (broadcast channel, focus refetch, etc.) is never initialised.
  // The chat route gets this for free via ThreadListSidebar's useSession().
  authClient.useSession();

  const pathname = usePathname();

  // pathname is e.g. "/activity-planner" — grab the last segment
  const segments = pathname.split("/").filter(Boolean);
  const currentSegment = segments[segments.length - 1] ?? "";
  const pageTitle = formatSegment(currentSegment);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink render={<Link href="/workflows" />}>Workflows</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
