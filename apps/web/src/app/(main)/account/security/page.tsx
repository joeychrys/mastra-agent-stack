import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import DeleteAccountCard from "./components/delete-account-card";
import EmailCard from "./components/email-card";
import PasswordCard from "./components/password-card";
import SessionsCard from "./components/sessions-card";

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
    throw redirect("/sign-in");
  });

  const isCredentialAccount = userAccounts.some((account) => account.providerId === "credential");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Security</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manage your account security settings.
        </p>
      </div>

      <div className="space-y-6">
        <EmailCard />
        {user?.user.emailVerified && isCredentialAccount && <PasswordCard user={user.user} />}
        <SessionsCard activeSessions={JSON.parse(JSON.stringify(activeSessions))} />
        <DeleteAccountCard />
      </div>
    </div>
  );
}
