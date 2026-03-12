import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

import EmailCard from './components/email-card';
import PasswordCard from './components/password-card';
import SessionsCard from './components/sessions-card';
import DeleteAccountCard from './components/delete-account-card';

export default async function SecurityPage() {
  const [activeSessions, userAccounts, user] = await Promise.all([
    auth.api.listSessions({
      headers: await headers(),
    }),
    auth.api.listUserAccounts({
      headers: await headers(),
    }),
    auth.api.getSession({
      headers: await headers(),
    }),
  ]).catch((e) => {
    console.log(e);
    throw redirect('/sign-in');
  });

  const isCredentialAccount = userAccounts.some((account) => account.providerId === 'credential');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="text-muted-foreground text-sm">Manage your account security settings.</p>
      </div>

      <div className="space-y-6 rounded-lg p-4 sm:p-6">
        <EmailCard />
        {user?.user.emailVerified && isCredentialAccount && <PasswordCard user={user.user} />}
        <SessionsCard activeSessions={JSON.parse(JSON.stringify(activeSessions))} />
        <DeleteAccountCard />
      </div>
    </div>
  );
}
