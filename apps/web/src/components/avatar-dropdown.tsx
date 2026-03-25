"use client";

import { LogOut, Receipt, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient as client } from "@/lib/auth-client";
import type { Session } from "@/lib/types";

export default function AvatarDropdown(props: { session: Session | null }) {
  const router = useRouter();
  const { data } = client.useSession();
  const session = data || props.session;

  if (!session) return null;
  const user = session.user;

  const userInitial =
    typeof user.name === "string" && user.name.trim() !== ""
      ? user.name.charAt(0).toUpperCase()
      : "?";

  const handleSignOut = async () => {
    await client.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/sign-in");
          router.refresh();
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg border border-input bg-transparent transition outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50">
        <span className="text-md font-medium">{userInitial}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/account/profile" className="flex w-full items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/account/security" className="flex w-full items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/account/billing" className="flex w-full items-center gap-2">
            <Receipt className="h-3.5 w-3.5" />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <div className="flex w-full items-center gap-2">
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
