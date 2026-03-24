import { ReactNode } from 'react';
import { Toaster } from 'sonner';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-6xl p-8">
      {children}
      <Toaster />
    </div>
  );
}
