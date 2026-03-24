'use client';

import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';
import type { User } from '@/lib/types';

export default function PasswordCard({ user }: { user: User }) {
  const [sending, setSending] = useState<boolean>(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Password</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              Update your password to keep your account secure. Email will be sent to your account
              email.
            </p>
          </div>
          <Button
            disabled={sending}
            variant="destructive"
            onClick={async () => {
              setSending(true);
              await authClient.requestPasswordReset({
                email: user.email,
                redirectTo: '/reset-password',
                fetchOptions: {
                  onResponse: () => {
                    toast.success('Email sent to reset your password');
                    setSending(true);
                  },
                  onRequest: () => {
                    setSending(true);
                  },
                  onError: (ctx) => {
                    toast.error(ctx.error.message);
                    setSending(false);
                  },
                },
              });
            }}
          >
            {sending ? 'Email Sent' : 'Send Reset Link'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
