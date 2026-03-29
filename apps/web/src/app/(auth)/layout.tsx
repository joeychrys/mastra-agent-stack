import type { ReactNode } from "react";
import { Toaster } from "sonner";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
