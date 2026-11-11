import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";

/**
 * Client-side role gate for navigation/visibility ONLY. This is UX, never a
 * security boundary — every protected action is authorized server-side by
 * `requirePermission`. A user who lacks the role is sent
 * back to the app root.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
