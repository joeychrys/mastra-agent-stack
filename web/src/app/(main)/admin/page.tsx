'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaginationState } from '@tanstack/react-table';
import { Loader2, Plus, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { TableCard } from '@/components/tables/user-table/table-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authClient } from '@/lib/auth-client';
import { User } from '@/lib/types';
import { useDebounce } from '@/lib/use-debounce';

interface UsersResponse {
  users: User[];
  total: number;
  limit?: number;
}

type UserRole = 'admin' | 'user';

interface UserQueryParams {
  limit: number;
  offset: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  searchField?: 'name' | 'email';
  searchOperator?: 'contains' | 'starts_with' | 'ends_with';
  searchValue?: string;
}

export default function AdminPage() {
  const queryClient = useQueryClient();

  // Add User state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as UserRole,
  });
  const [isLoading, setIsLoading] = useState<string | undefined>();

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  // Derived values for convenience
  const [totalUsers, setTotalUsers] = useState(0);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField] = useState<'name' | 'email'>('name');
  const [searchOperator] = useState<'contains' | 'starts_with' | 'ends_with'>('contains');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to first page when search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearchTerm]);

  // Main users query
  const { data: usersData, isLoading: isUsersLoading } = useQuery<UsersResponse>({
    queryKey: ['users', pagination.pageIndex, pagination.pageSize, debouncedSearchTerm],
    queryFn: async () => {
      try {
        setIsSearching(!!debouncedSearchTerm);

        const queryParams: UserQueryParams = {
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize, // 0-based index * pageSize
          sortBy: 'createdAt',
          sortDirection: 'desc',
        };

        // Add search parameters if there's a search term
        if (debouncedSearchTerm) {
          queryParams.searchField = searchField;
          queryParams.searchOperator = searchOperator;
          queryParams.searchValue = debouncedSearchTerm;
        }

        const data = await authClient.admin.listUsers(
          {
            query: queryParams,
          },
          {
            throw: true,
          }
        );

        // Update pagination state
        if (data) {
          setTotalUsers(data.total || 0);
        }

        return data as UsersResponse;
      } catch (error: unknown) {
        let errorMessage = 'Failed to fetch users';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        toast.error(errorMessage);
        return { users: [], total: 0, limit: 0 } as UsersResponse;
      } finally {
        setIsSearching(false);
      }
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading('create');
    try {
      await authClient.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
      });
      toast.success('User created successfully');
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['users'],
      });
      // Also invalidate our count queries
      queryClient.invalidateQueries({
        queryKey: ['users-admin-count'],
      });
      queryClient.invalidateQueries({
        queryKey: ['users-banned-count'],
      });
    } catch (error: unknown) {
      let errorMessage = 'Failed to create user';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  useEffect(() => {
    const queryParams: UserQueryParams = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize, // 0-based index * pageSize
      sortBy: 'createdAt',
      sortDirection: 'desc',
    };

    if (debouncedSearchTerm && searchField && searchOperator) {
      queryParams.searchValue = debouncedSearchTerm;
      queryParams.searchField = searchField;
      queryParams.searchOperator = searchOperator;
    }

    queryClient.invalidateQueries({
      queryKey: ['users', pagination.pageIndex, pagination.pageSize, debouncedSearchTerm],
    });
  }, [pagination, queryClient, debouncedSearchTerm, searchField, searchOperator]);

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users and system settings</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account with specific permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>User</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="w-full" disabled={isLoading === 'create'}>
                  {isLoading === 'create' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <CardTitle>User Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Search bar */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[300px]"
                />
                {searchTerm && (
                  <Button variant="ghost" onClick={handleClearSearch}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {isUsersLoading || isSearching ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : (
              <TableCard
                data={usersData?.users || []}
                totalRows={totalUsers}
                pagination={pagination}
                onPaginationChange={setPagination}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
