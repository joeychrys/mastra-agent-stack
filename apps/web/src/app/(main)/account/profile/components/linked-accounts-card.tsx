import { SatelliteDish } from "lucide-react";

import { GoogleIcon } from "@/components/icons/google-icon";
import type { UserAccounts } from "@/lib/types";

export default function LinkedAccountsCard({ userAccounts }: { userAccounts: UserAccounts }) {
  // Convert provider string to proper case
  const formatProvider = (provider: string) => {
    return provider
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Filter to only include Google accounts
  const googleAccounts = userAccounts.filter(
    (account) => account.providerId.toLowerCase() === "google",
  );

  // Don't render if no Google accounts
  if (googleAccounts.length === 0) {
    return null;
  }

  const date = new Date(googleAccounts[0].createdAt);

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex items-center gap-3">
        <SatelliteDish className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <span className="font-medium">Connected accounts</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        See your connected accounts
      </p>
      <div className="mt-5 space-y-3">
        {googleAccounts.map((account) => (
          <div key={account.id} className="flex items-center gap-3 rounded-md">
            <div className="flex h-10 w-10 items-center justify-center">
              <GoogleIcon />
            </div>
            <div className="flex-1">
              <p className="font-medium">{formatProvider(account.providerId)}</p>
              <p className="text-sm text-muted-foreground">{date.toDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
