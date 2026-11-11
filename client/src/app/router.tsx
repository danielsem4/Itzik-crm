import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { IndexRedirect } from "./IndexRedirect";
import { RootLayout } from "./layout/RootLayout";
import { AppLayout } from "./layout/AppLayout";
import {
  ActivatePage,
  ForgotPasswordPage,
  GuestRoute,
  LoginPage,
  ProtectedRoute,
  ResetPasswordPage,
  RoleRoute,
} from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { AdminsPage, EmployeesPage, UserDetailsPage } from "@/features/users";
import { SettingsPage } from "@/features/settings";

export const router = createBrowserRouter([
  {
    element: (
      <AppProviders>
        <RootLayout>
          <Outlet />
        </RootLayout>
      </AppProviders>
    ),
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password", element: <ResetPasswordPage /> },
          { path: "/activate", element: <ActivatePage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <IndexRedirect /> },
              { path: "/dashboard", element: <DashboardPage /> },
              {
                element: <RoleRoute allow={["SUPER_ADMIN"]} />,
                children: [
                  { path: "/admins", element: <AdminsPage /> },
                  { path: "/admins/:id", element: <UserDetailsPage role="ADMIN" /> },
                ],
              },
              {
                element: <RoleRoute allow={["ADMIN", "SUPER_ADMIN"]} />,
                children: [
                  { path: "/employees", element: <EmployeesPage /> },
                  { path: "/employees/:id", element: <UserDetailsPage role="EMPLOYEE" /> },
                ],
              },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
