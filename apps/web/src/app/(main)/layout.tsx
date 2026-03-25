import type { ReactNode } from "react";
import { Toaster } from "sonner";

import NavBar from "@/components/nav-bar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Toaster />
    </div>
  );
}
