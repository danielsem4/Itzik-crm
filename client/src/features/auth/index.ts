// Public API of the auth feature. Import from "@/features/auth" only.
export { AuthProvider } from "./context/AuthContext";
export { useAuth } from "./hooks/useAuth";
export { useChangePasswordMutation } from "./hooks/useAuthMutations";
export { ProtectedRoute } from "./components/ProtectedRoute";
export { GuestRoute } from "./components/GuestRoute";
export { RoleRoute } from "./components/RoleRoute";
export { LoginPage } from "./pages/LoginPage";
export { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
export { ResetPasswordPage } from "./pages/ResetPasswordPage";
export { ActivatePage } from "./pages/ActivatePage";
export { PERMISSIONS, hasPermission, type Permission } from "./lib/permissions";
export {
  PASSWORD_MIN_LENGTH,
  createChangePasswordSchema,
  type ChangePasswordValues,
} from "./schemas/auth.schemas";
export type { Role, User, UserStatus } from "./types";
