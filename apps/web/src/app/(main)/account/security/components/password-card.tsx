"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/types";

export default function PasswordCard({ user }: { user: User }) {
  const [sending, setSending] = useState<boolean>(false);

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <KeyRound className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Password</span>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Update your password to keep your account secure. Email will be sent to your account
            email.
          </p>
        </div>
        <Button
          disabled={sending}
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={async () => {
            setSending(true);
            await authClient.requestPasswordReset({
              email: user.email,
              redirectTo: "/reset-password",
              fetchOptions: {
                onResponse: () => {
                  toast.success("Email sent to reset your password");
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
          {sending ? "Email Sent" : "Send Reset Link"}
        </Button>
      </div>
    </div>
  );
}
