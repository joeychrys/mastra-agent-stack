"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function WorkflowLayout({ children }: { children: ReactNode }) {
  // Mount the Better Auth session atom so the client-side session state is
  // established before any authClient.token() calls.  Without this, token
  // requests on page refresh return 401 because the session refresh manager
  // (broadcast channel, focus refetch, etc.) is never initialised.
  authClient.useSession();

  // Pages own their full-height chrome (sidebar + header), mirroring the chat
  // route's SidebarProvider pattern.
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
