'use client';

import { Mail } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth-client';

export default function EmailCard() {
  const { data: session } = authClient.useSession();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
          <p className="text-muted-foreground text-sm">Loading your security information...</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Email verification</CardTitle>
        </div>
        <CardDescription>Verify your email address to secure your account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="">
          <Separator className="my-4" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <span>{session.user.email}</span>
            </div>
            {session.user.emailVerified ? (
              <Button
                variant="default"
                size="sm"
                className="mt-2 bg-green-100 text-green-800 hover:cursor-default hover:bg-green-100 sm:mt-0 sm:shrink-0"
              >
                Verified
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={isVerifying}
                size="sm"
                className="mt-2 sm:mt-0 sm:shrink-0"
                onClick={async () => {
                  await authClient
                    .sendVerificationEmail({
                      email: session.user.email,
                      callbackURL: '/account/security',
                    })
                    .then(() => {
                      toast.success('Verification email sent');
                      setIsVerifying(true);
                    })
                    .catch((error) => {
                      toast.error(error.message);
                      setIsVerifying(false);
                    });
                }}
              >
                Verify Email
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
