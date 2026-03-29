"use client";

import CreateUserDialog from "@/app/(main)/admin/components/create-user-dialog";

export default function AdminHeader() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Manage users and system settings</p>
      </div>
      <CreateUserDialog />
    </div>
  );
}
