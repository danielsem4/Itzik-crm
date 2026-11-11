import { Navigate } from "react-router-dom";

/** Default landing for an authenticated user. */
export function IndexRedirect() {
  return <Navigate to="/dashboard" replace />;
}
