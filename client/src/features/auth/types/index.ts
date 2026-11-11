// Mirrors the server Role enum (server/prisma/schema.prisma).
export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

export type UserStatus = "INVITED" | "ACTIVE" | "DISABLED";

/** Public user shape returned by the API (server UserDto — no secrets). */
export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

/** Response of POST /auth/login and GET /auth/me — an established session. */
export interface AuthSession {
  user: User;
  csrfToken: string;
}
