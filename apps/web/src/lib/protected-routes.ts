import type { ProtectedRoute } from "@/lib/types";

export const protectedRoutes: ProtectedRoute[] = [
  {
    path: "/admin",
    roles: ["admin"],
  },
  {
    path: "/chat",
    roles: ["user"],
  },
  {
    path: "/account/*",
    roles: ["user"],
  },
];
