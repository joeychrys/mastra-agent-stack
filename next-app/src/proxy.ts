import { betterFetch } from '@better-fetch/fetch'; // Re-add betterFetch
import { NextRequest, NextResponse } from 'next/server';

import type { auth } from '@/lib/auth'; // Re-add auth for Session type
import { protectedRoutes } from '@/lib/protected-routes'; // Import static routes

// Define Session type locally
type Session = typeof auth.$Infer.Session & { user?: { role?: string } };

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip checking static files, Next.js internals, and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/api/') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get the session
  const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
    cache: 'no-store',
  });

  // Optional: Allow admin users direct access
  if (session?.user?.role === 'admin') {
    return NextResponse.next();
  }

  // Check if the current path matches any defined protected route pattern
  const protectedRoute = protectedRoutes?.find((route) => {
    if (!route.path) return false;
    const pattern = route.path.replace(/\*/g, '.*');
    const routeRegex = new RegExp(`^${pattern}$`);
    return routeRegex.test(path);
  });

  // If the current path does NOT match any defined protected route, allow access.
  if (!protectedRoute) {
    return NextResponse.next();
  }

  // --- At this point, the path IS identified as a protected route ---

  // 1. Check if the user is authenticated
  if (!session) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // 2. Check if the user's role is sufficient for this route
  const allowedRoles = protectedRoute.roles || [];
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user?.role || '')) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated and has the required role
  return NextResponse.next();
}

// Re-add the config if needed, otherwise middleware applies to all routes
// export const config = {
// 	matcher: [/* specific paths */],
// };
