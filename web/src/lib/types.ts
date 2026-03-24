import { auth } from '@/lib/auth';

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
export type UserAccounts = {
  id: string;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
  accountId: string;
  userId: string;
  scopes: string[];
}[];

// Represents a route object with roles as a string array (application/API format)
export interface ProtectedRoute {
  path?: string;
  roles?: string[];
}

export interface EmailTemplateProps {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null | undefined;
  };
  url: string;
}
