'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient as client } from '@/lib/auth-client';
import { Session } from '@/lib/types';

export default function AvatarDropdown(props: { session: Session | null }) {
  const router = useRouter();
  const { data } = client.useSession();
  const session = data || props.session;

  // If no user is found, don't render the dropdown
  if (!session) return null;
  const user = session.user;

  // Get the user's initial, ensuring name exists and is a string
  const userInitial =
    typeof user.name === 'string' && user.name.trim() !== ''
      ? user.name.charAt(0).toUpperCase()
      : '?';

  const handleSignOut = async () => {
    await client.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Redirect to sign-in page
          router.push('/sign-in');
          router.refresh();
        },
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          className="ring-primary transition duration-300 ease-in-out hover:ring"
        >
          <Avatar className="shadow">
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/security">Security</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/account/billing">Billing</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
