'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || '';

export default function AccountDeletionDialog() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailPending, setEmailPending] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      await authClient.deleteUser({
        callbackURL: '/goodbye',
        fetchOptions: {
          onResponse: () => {
            toast.success('Email sent to confirm your account deletion');
            setDialogOpen(false);
            setEmailPending(false);
          },
          onError: (ctx) => {
            toast.error(ctx.error.message);
            setEmailPending(false);
          },
          onRequest: () => {
            setEmailPending(true);
          },
        },
      });
    } catch (error: unknown) {
      let errorMessage = 'Failed to delete account';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setEmailPending(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button>Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription>
            Sorry to see you go! We will send you an email to confirm your account deletion.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={emailPending}>
            {emailPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              'Delete Account'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
