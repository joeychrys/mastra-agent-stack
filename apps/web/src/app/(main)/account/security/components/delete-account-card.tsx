import { OctagonX } from "lucide-react";

import AccountDeletionDialog from "./dialogs/account-deletion-dialog";

export default function DeleteAccountCard() {
  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <OctagonX className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Delete Account</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Delete your account to permanently remove your account and all associated data.
      </p>
      <div className="mt-5">
        <AccountDeletionDialog />
      </div>
    </div>
  );
}
