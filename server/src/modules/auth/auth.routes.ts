/**
 * Auth routes (deny-by-default). Public endpoints are rate-limited by IP + an
 * account/token dimension; authenticated endpoints require `authenticate`, and
 * every state-changing one requires `csrf`. Sensitive actions add
 * `requireRecentAuth`; user creation adds `requirePermission`. The target role
 * for provisioning is fixed by the endpoint, never taken from the body.
 */
import { Router, type Request, type RequestHandler } from "express";
import { Role } from "@prisma/client";
import { createRateLimiter } from "../../shared/middlewares/rateLimit";
import { validateRequest } from "../../shared/middlewares/validateRequest";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { requireRecentAuth } from "../../shared/middlewares/requireRecentAuth";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { RATE_LIMIT_POLICIES } from "../../config";
import { PERMISSIONS } from "../../shared/authz";
import type { AuthController } from "./auth.controller";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  activateSchema,
  inviteSchema,
  revokeSessionSchema,
  listUsersQuerySchema,
} from "./auth.schema";

export interface AuthRouterDeps {
  controller: AuthController;
  authenticate: RequestHandler;
  csrf: RequestHandler;
}

const bodyStr = (field: string) => (req: Request): string | undefined => {
  const value = (req.body as Record<string, unknown> | undefined)?.[field];
  return typeof value === "string" ? value.toLowerCase() : undefined;
};

export function createAuthRouter(deps: AuthRouterDeps): Router {
  const { controller, authenticate, csrf } = deps;
  const router = Router();

  const emailKey = bodyStr("email");
  const tokenKey = bodyStr("token");

  // --- Public ------------------------------------------------------------
  router.post(
    "/api/auth/login",
    createRateLimiter(RATE_LIMIT_POLICIES.auth, { keySelector: emailKey }),
    validateRequest({ body: loginSchema }),
    asyncHandler(controller.login)
  );

  router.post(
    "/api/auth/password/forgot",
    createRateLimiter(RATE_LIMIT_POLICIES.passwordReset, { keySelector: emailKey }),
    validateRequest({ body: forgotPasswordSchema }),
    asyncHandler(controller.forgotPassword)
  );

  router.post(
    "/api/auth/password/reset",
    createRateLimiter(RATE_LIMIT_POLICIES.passwordReset, { keySelector: tokenKey }),
    validateRequest({ body: resetPasswordSchema }),
    asyncHandler(controller.resetPassword)
  );

  router.post(
    "/api/auth/activate",
    createRateLimiter(RATE_LIMIT_POLICIES.activation, { keySelector: tokenKey }),
    validateRequest({ body: activateSchema }),
    asyncHandler(controller.activate)
  );

  // --- Authenticated -----------------------------------------------------
  router.get("/api/auth/me", authenticate, asyncHandler(controller.me));

  router.post("/api/auth/logout", authenticate, csrf, asyncHandler(controller.logout));

  router.post(
    "/api/auth/sessions/revoke",
    authenticate,
    csrf,
    validateRequest({ body: revokeSessionSchema }),
    asyncHandler(controller.revokeSession)
  );

  router.post(
    "/api/auth/sessions/revoke-all",
    authenticate,
    csrf,
    requireRecentAuth(),
    asyncHandler(controller.revokeAll)
  );

  router.post(
    "/api/auth/password/change",
    authenticate,
    csrf,
    requireRecentAuth(),
    validateRequest({ body: changePasswordSchema }),
    asyncHandler(controller.changePassword)
  );

  // Provisioning — role fixed by the endpoint, gated by the matching permission.
  router.post(
    "/api/auth/users/employee",
    authenticate,
    csrf,
    requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
    validateRequest({ body: inviteSchema }),
    asyncHandler(controller.invite(Role.EMPLOYEE))
  );

  router.post(
    "/api/auth/users/admin",
    authenticate,
    csrf,
    requireRecentAuth(),
    requirePermission(PERMISSIONS.ADMIN_CREATE),
    validateRequest({ body: inviteSchema }),
    asyncHandler(controller.invite(Role.ADMIN))
  );

  // --- User directory (list / view / deactivate) -------------------------
  // Employees directory: ADMIN and SUPER_ADMIN (EMPLOYEE_MANAGE).
  router.get(
    "/api/auth/users/employees",
    authenticate,
    requirePermission(PERMISSIONS.EMPLOYEE_MANAGE),
    validateRequest({ query: listUsersQuerySchema }),
    asyncHandler(controller.listUsers(Role.EMPLOYEE))
  );

  router.get(
    "/api/auth/users/employees/:id",
    authenticate,
    requirePermission(PERMISSIONS.EMPLOYEE_MANAGE),
    asyncHandler(controller.getUser(Role.EMPLOYEE))
  );

  router.post(
    "/api/auth/users/employees/:id/deactivate",
    authenticate,
    csrf,
    requirePermission(PERMISSIONS.EMPLOYEE_MANAGE),
    asyncHandler(controller.deactivateUser(Role.EMPLOYEE))
  );

  // Admins directory: SUPER_ADMIN only (ADMIN_MANAGE); mutations need recent auth.
  router.get(
    "/api/auth/users/admins",
    authenticate,
    requirePermission(PERMISSIONS.ADMIN_MANAGE),
    validateRequest({ query: listUsersQuerySchema }),
    asyncHandler(controller.listUsers(Role.ADMIN))
  );

  router.get(
    "/api/auth/users/admins/:id",
    authenticate,
    requirePermission(PERMISSIONS.ADMIN_MANAGE),
    asyncHandler(controller.getUser(Role.ADMIN))
  );

  router.post(
    "/api/auth/users/admins/:id/deactivate",
    authenticate,
    csrf,
    requireRecentAuth(),
    requirePermission(PERMISSIONS.ADMIN_MANAGE),
    asyncHandler(controller.deactivateUser(Role.ADMIN))
  );

  return router;
}
