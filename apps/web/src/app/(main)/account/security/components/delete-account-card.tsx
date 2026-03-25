import { OctagonX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AccountDeletionDialog from "./dialogs/account-deletion-dialog";

export default function DeleteAccountCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <OctagonX className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Delete Account</CardTitle>
        </div>
        <CardDescription>
          Delete your account to permanently remove your account and all associated data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Separator className="my-4" />
        <AccountDeletionDialog />
      </CardContent>
    </Card>
  );
}
