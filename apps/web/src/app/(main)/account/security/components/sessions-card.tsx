"use client";

import { Fingerprint } from "lucide-react";

import { columns } from "@/app/(main)/account/security/components/sessions-table/columns";
import { DataTable } from "@/app/(main)/account/security/components/sessions-table/data-table";
import type { Session } from "@/lib/types";

import RevokeSessionsDialog from "./dialogs/revoke-sessions-dialog";

export default function SessionsCard(props: { activeSessions: Session["session"][] }) {
  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <Fingerprint className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Active sessions</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Manage your active sessions
      </p>
      <div className="mt-5">
        <DataTable columns={columns} data={props.activeSessions} />
      </div>
      {props.activeSessions.length > 1 && (
        <div className="mt-4">
          <RevokeSessionsDialog />
        </div>
      )}
    </div>
  );
}
