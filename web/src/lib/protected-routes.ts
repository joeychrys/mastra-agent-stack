import type { ProtectedRoute } from '@/lib/types';

export const protectedRoutes: ProtectedRoute[] = [
  {
    path: '/admin',
    roles: ['admin'],
  },
  {
    path: '/dashboard',
    roles: ['user'],
  },
  {
    path: '/account/*',
    roles: ['user'],
  },
];
