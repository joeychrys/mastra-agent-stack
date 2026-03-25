"use client";

import { User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Session } from "@/lib/types";

import NameChangeDialog from "./dialogs/name-change-dialog";

export default function ProfileCard(props: { session: Session }) {
  const userInitial = props.session?.user?.name
    ? props.session.user.name.charAt(0).toUpperCase()
    : "?";

  const memberSince = props.session?.user?.createdAt
    ? new Date(props.session.user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Personal Information</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Manage your personal details and how they appear to others
      </p>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="text-base">{userInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-medium">{props.session.user.name}</h2>
              {props.session.user.role && (
                <Badge
                  variant={props.session.user.role === "admin" ? "destructive" : "secondary"}
                  className="dark:text-destructive-foreground shrink-0 text-white"
                >
                  {props.session.user.role}
                </Badge>
              )}
            </div>
            {memberSince && (
              <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
            )}
          </div>
        </div>

        <NameChangeDialog />
      </div>
    </div>
  );
}
