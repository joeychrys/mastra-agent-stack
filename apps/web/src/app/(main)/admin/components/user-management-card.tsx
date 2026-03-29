"use client";

import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import UserSearchBar from "@/app/(main)/admin/components/user-search-bar";
import { TableCard } from "@/app/(main)/admin/components/user-table/table-card";
import { useDebounce } from "@/app/(main)/admin/lib/use-debounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/types";

interface UsersResponse {
  users: User[];
  total: number;
  limit?: number;
}

interface UserQueryParams {
  limit: number;
  offset: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
  searchField?: "name" | "email";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  searchValue?: string;
}

export default function UserManagementCard() {
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to first page when search term changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Main users query
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UsersResponse>({
    queryKey: ["users", pagination.pageIndex, pagination.pageSize, debouncedSearchTerm],
    queryFn: async () => {
      const queryParams: UserQueryParams = {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        sortBy: "createdAt",
        sortDirection: "desc",
      };

      if (debouncedSearchTerm) {
        queryParams.searchField = "name";
        queryParams.searchOperator = "contains";
        queryParams.searchValue = debouncedSearchTerm;
      }

      try {
        const data = await authClient.admin.listUsers({ query: queryParams }, { throw: true });
        return data as UsersResponse;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to fetch users";
        toast.error(msg);
        return { users: [], total: 0 } as UsersResponse;
      }
    },
  });

  const totalRows = usersData?.total ?? 0;

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <CardTitle>User Management</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col gap-4">
          <UserSearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClear={() => handleSearchChange("")}
          />

          {isUsersLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TableCard
              data={usersData?.users ?? []}
              totalRows={totalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
