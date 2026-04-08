import type { ProtectedRoute } from "@/lib/types";

export const protectedRoutes: ProtectedRoute[] = [
  {
    path: "/admin",
    roles: ["admin"],
  },
  {
    path: "/weather-assistant",
    roles: ["user"],
  },
  {
    path: "/activity-planner",
    roles: ["user"],
  },
  {
    path: "/account/*",
    roles: ["user"],
  },
];
