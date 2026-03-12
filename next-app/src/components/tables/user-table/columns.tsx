'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Key, LockIcon, MoreHorizontal, Shield, Trash, UserCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@/lib/types';

// This is a client component, but columns need to be defined outside the component
// We'll create a function that returns the columns with the necessary handlers
export const getColumns = (
  handleDeleteUser: (id: string) => Promise<void>,
  handleRevokeSessions: (id: string) => Promise<void>,
  handleImpersonateUser: (id: string) => Promise<void>,
  handleBanUser: (id: string) => void,
  handleUnbanUser: (id: string) => Promise<void>,
  isLoading?: string
): ColumnDef<User>[] => [
  {
    header: 'User',
    accessorKey: 'name',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
            <UserCircle className="text-primary h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="font-medium">{user.name}</div>
            <div className="text-muted-foreground text-sm md:hidden">{user.email}</div>
            <div className="mt-1 flex items-center gap-2 md:hidden">
              <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                {user.role || 'user'}
              </Badge>
              {user.banned && <Badge variant="destructive">Banned</Badge>}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    header: 'Email',
    accessorKey: 'email',
    cell: ({ row }) => {
      return <div className="hidden md:block">{row.original.email}</div>;
    },
  },
  {
    header: 'Role',
    accessorKey: 'role',
    cell: ({ row }) => {
      return (
        <div className="hidden md:block">
          <Badge variant={row.original.role === 'admin' ? 'default' : 'outline'}>
            {row.original.role || 'user'}
          </Badge>
        </div>
      );
    },
  },
  {
    header: 'Status',
    accessorKey: 'banned',
    cell: ({ row }) => {
      return (
        <div className="hidden md:block">
          {row.original.banned ? (
            <Badge variant="destructive">Banned</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  handleImpersonateUser(user.id).then(() => {
                    window.location.reload();
                  })
                }
                disabled={isLoading?.startsWith('impersonate')}
              >
                <UserCircle className="mr-2 h-4 w-4" />
                Impersonate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRevokeSessions(user.id)}
                disabled={isLoading?.startsWith('revoke')}
              >
                <Key className="mr-2 h-4 w-4" />
                Revoke Sessions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (user.banned) {
                    handleUnbanUser(user.id);
                  } else {
                    handleBanUser(user.id);
                  }
                }}
                disabled={isLoading?.startsWith('ban')}
                className={user.banned ? 'text-green-600' : 'text-amber-600'}
              >
                {user.banned ? (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Unban User
                  </>
                ) : (
                  <>
                    <LockIcon className="mr-2 h-4 w-4" />
                    Ban User
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteUser(user.id)}
                disabled={isLoading?.startsWith('delete')}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

// Default export for backward compatibility
export const columns: ColumnDef<User>[] = [
  {
    header: 'Name',
    accessorKey: 'name',
  },
  {
    header: 'Email',
    accessorKey: 'email',
  },
  {
    header: 'Role',
    accessorKey: 'role',
  },
];
