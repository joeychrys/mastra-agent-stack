import { SatelliteDish } from 'lucide-react';

import { GoogleIcon } from '@/components/icons/google-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAccounts } from '@/lib/types';

export default function LinkedAccountsCard({ userAccounts }: { userAccounts: UserAccounts }) {
  // Convert provider string to proper case
  const formatProvider = (provider: string) => {
    return provider
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Filter to only include Google accounts
  const googleAccounts = userAccounts.filter(
    (account) => account.providerId.toLowerCase() === 'google'
  );

  // Don't render if no Google accounts
  if (googleAccounts.length === 0) {
    return null;
  }

  const date = new Date(googleAccounts[0].createdAt);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <SatelliteDish className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Connected accounts</CardTitle>
        </div>
        <CardDescription>See your connected accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {googleAccounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3 rounded-md">
              <div className="flex h-10 w-10 items-center justify-center">
                <GoogleIcon />
              </div>
              <div className="flex-1">
                <p className="font-medium">{formatProvider(account.providerId)}</p>
                <p className="text-muted-foreground text-sm">{date.toDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
