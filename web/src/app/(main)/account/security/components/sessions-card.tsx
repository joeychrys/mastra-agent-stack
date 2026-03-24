'use client';

import { Fingerprint } from 'lucide-react';

import { columns } from '@/components/tables/sessions-table/columns';
import { DataTable } from '@/components/tables/sessions-table/data-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Session } from '@/lib/types';

import RevokeSessionsDialog from './dialogs/revoke-sessions-dialog';

export default function SessionsCard(props: { activeSessions: Session['session'][] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Active sessions</CardTitle>
        </div>
        <CardDescription>Manage your active sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={props.activeSessions} />
      </CardContent>
      {props.activeSessions.length > 1 && (
        <CardFooter className="pt-0">
          <RevokeSessionsDialog />
        </CardFooter>
      )}
    </Card>
  );
}
