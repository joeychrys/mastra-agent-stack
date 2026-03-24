import { polarClient } from '@polar-sh/better-auth';
import { adminClient, jwtClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

// Use environment variable or default to relative URL which will use current origin
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || '';

export const authClient = createAuthClient({
  baseURL, // will use current origin if empty
  plugins: [adminClient(), polarClient(), jwtClient()],
});
