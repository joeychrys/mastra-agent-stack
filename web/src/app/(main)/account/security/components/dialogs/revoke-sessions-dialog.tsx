'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { authClient } from '@/lib/auth-client';

export default function RevokeSessionsDialog() {
  const router = useRouter();
  const { isPending } = authClient.useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRevokeSessions = async () => {
    try {
      await authClient.revokeOtherSessions();
      toast.success('Sessions revoked successfully');
      router.refresh();
      setDialogOpen(false);
    } catch (error: unknown) {
      let errorMessage = 'Failed to revoke sessions';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(`Error: ${errorMessage}`);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Revoke Sessions</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Revoke Sessions</DialogTitle>
          <DialogDescription>
            Revoking all active sessions for your account will log you out of all devices except the
            one you are currently on.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="mr-2">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevokeSessions} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Sessions'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
