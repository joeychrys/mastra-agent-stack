"use client";

import Link from "next/link";
import type * as React from "react";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThreadList } from "./thread-list";

export function ThreadListSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header px-4 pt-4 pb-0">
        <Link href="/" className="text-lg tracking-tight">
          Chat
        </Link>
      </SidebarHeader>
      <SidebarContent className="aui-sidebar-content px-2 pt-2">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter className="aui-sidebar-footer border-t">
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
