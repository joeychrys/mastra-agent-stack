"use client";

import AdminHeader from "@/app/(main)/admin/components/admin-header";
import UserManagementCard from "@/app/(main)/admin/components/user-management-card";

export default function AdminPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-6">
      <AdminHeader />
      <UserManagementCard />
    </div>
  );
}
