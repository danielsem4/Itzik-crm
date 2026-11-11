import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingState } from "@/components/shared";

/** Only for unauthenticated visitors (login / forgot-password / activate). */
export function GuestRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingState size="page" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
