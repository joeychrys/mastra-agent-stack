"use client";

import type { ReactNode } from "react";
import { ChatProviders } from "./lib/providers";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatProviders>{children}</ChatProviders>;
}
