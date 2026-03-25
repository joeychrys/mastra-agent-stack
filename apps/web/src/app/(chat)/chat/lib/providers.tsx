"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { FC, ReactNode } from "react";
import { queryClient } from "./query-client";

export const ChatProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
