'use client';

import { User } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Session } from '@/lib/types';

import NameChangeDialog from './dialogs/name-change-dialog';

export default function ProfileCard(props: { session: Session }) {
  // Get user initial for avatar
  const userInitial = props.session?.user?.name
    ? props.session.user.name.charAt(0).toUpperCase()
    : '?';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="mb-2 flex items-center gap-2">
          <User className="h-5 w-5" />
          <CardTitle className="text-lg font-medium">Personal Information</CardTitle>
        </div>
        <CardDescription>
          Manage your personal details and how they appear to others
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{props.session.user.name}</h2>
            {props.session.user.role && (
              <Badge
                variant={props.session.user.role === 'admin' ? 'destructive' : 'secondary'}
                className="dark:text-destructive-foreground mt-1 text-white"
              >
                {props.session.user.role}
              </Badge>
            )}
          </div>
          <NameChangeDialog />
        </div>
      </CardContent>
    </Card>
  );
}
