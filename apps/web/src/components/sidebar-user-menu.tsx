"use client";

import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

/**
 * User info + account menu for sidebar footers — shared by the chat and
 * workflow sidebars. Reads the session itself, so it's a drop-in child of
 * `<SidebarFooter>`.
 */
export function SidebarUserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const userInitial =
    typeof user?.name === "string" && user.name.trim() !== ""
      ? user.name.charAt(0).toUpperCase()
      : "?";

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <SidebarMenuButton size="lg" render={<DropdownMenuTrigger />}>
            <Avatar className="size-8">
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user?.name ?? "Guest"}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
          <DropdownMenuContent side="top" align="start" className="min-w-56 rounded-lg">
            <DropdownMenuItem render={<Link href="/account/profile" />}>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/account/security" />}>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
