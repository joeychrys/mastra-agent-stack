'use client';

import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatProviders } from './chat/lib/providers';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <ChatProviders>
      <TooltipProvider>{children}</TooltipProvider>
    </ChatProviders>
  );
}
