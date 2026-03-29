"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function EmailCard() {
  const { data: session } = authClient.useSession();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Security</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Loading your security information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Email verification</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Verify your email address to secure your account
      </p>
      <div className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <span className="text-sm">{session.user.email}</span>
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
                    callbackURL: "/account/security",
                  })
                  .then(() => {
                    toast.success("Verification email sent");
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
    </div>
  );
}
