import { useQueryClient } from '@tanstack/react-query';
import { OnChangeFn, PaginationState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { authClient as client } from '@/lib/auth-client';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';

import { getColumns } from './columns';
import { DataTable } from './data-table';

interface TableCardProps {
  data: User[];
  totalRows?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
}

export function TableCard({ data, totalRows, pagination, onPaginationChange }: TableCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | undefined>();
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [banForm, setBanForm] = useState({
    userId: '',
    reason: '',
    expirationDate: undefined as Date | undefined,
  });

  // Helper function to invalidate all user-related queries
  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ['users'],
    });
    queryClient.invalidateQueries({
      queryKey: ['users-admin-count'],
    });
    queryClient.invalidateQueries({
      queryKey: ['users-banned-count'],
    });
  };

  const handleDeleteUser = async (id: string) => {
    setIsLoading(`delete-${id}`);
    try {
      await client.admin.removeUser({ userId: id });
      toast.success('User deleted successfully');
      invalidateUserQueries();
    } catch (error: unknown) {
      let errorMessage = 'Failed to delete user';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  const handleRevokeSessions = async (id: string) => {
    setIsLoading(`revoke-${id}`);
    try {
      await client.admin.revokeUserSessions({ userId: id });
      toast.success('Sessions revoked for user');
    } catch (error: unknown) {
      let errorMessage = 'Failed to revoke sessions';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  const handleImpersonateUser = async (id: string) => {
    setIsLoading(`impersonate-${id}`);
    try {
      await client.admin.impersonateUser({ userId: id });
      toast.success('Impersonated user');
      router.push('/');
    } catch (error: unknown) {
      let errorMessage = 'Failed to impersonate user';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  const handleBanUser = (id: string) => {
    setBanForm({
      userId: id,
      reason: '',
      expirationDate: undefined,
    });
    setIsBanDialogOpen(true);
  };

  const handleUnbanUser = async (id: string) => {
    setIsLoading(`ban-${id}`);
    try {
      await client.admin.unbanUser({
        userId: id,
      });
      invalidateUserQueries();
      toast.success('User unbanned successfully');
    } catch (error: unknown) {
      let errorMessage = 'Failed to unban user';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  const submitBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(`ban-${banForm.userId}`);
    try {
      if (!banForm.expirationDate) {
        throw new Error('Expiration date is required');
      }
      await client.admin.banUser({
        userId: banForm.userId,
        banReason: banForm.reason,
        banExpiresIn: banForm.expirationDate.getTime() - new Date().getTime(),
      });
      toast.success('User banned successfully');
      setIsBanDialogOpen(false);
      invalidateUserQueries();
    } catch (error: unknown) {
      let errorMessage = 'Failed to ban user';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(undefined);
    }
  };

  // Use the enhanced columns with action handlers
  const enhancedColumns = getColumns(
    handleDeleteUser,
    handleRevokeSessions,
    handleImpersonateUser,
    handleBanUser,
    handleUnbanUser,
    isLoading
  );

  return (
    <>
      <DataTable
        columns={enhancedColumns}
        data={data}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />

      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>Set a ban period and reason for this user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitBanUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for ban</Label>
              <Input
                id="reason"
                placeholder="Violation of terms..."
                value={banForm.reason}
                onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expirationDate">Ban Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="expirationDate"
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !banForm.expirationDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {banForm.expirationDate ? (
                      format(banForm.expirationDate, 'PPP')
                    ) : (
                      <span>Select ban expiration date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={banForm.expirationDate}
                    onSelect={(date) => setBanForm({ ...banForm, expirationDate: date })}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              {!banForm.expirationDate && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Select a future date when the ban will expire
                </p>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={isLoading === `ban-${banForm.userId}`}
              >
                {isLoading === `ban-${banForm.userId}` ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Banning...
                  </>
                ) : (
                  'Ban User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
