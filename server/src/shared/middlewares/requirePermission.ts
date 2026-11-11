/**
 * Authorization guards.
 *
 * These are the ONLY place routes express authorization — deny-by-default, no
 * ad-hoc role comparisons scattered through controllers. They run AFTER
 * `authenticate` (which populates `req.principal`); authentication and
 * authorization are always separate checks. Missing principal ⇒ 401; principal
 * lacking the capability ⇒ 403.
 */
import type { RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { UnauthenticatedError, ForbiddenError } from "../errors";
import { hasPermission, type Permission } from "../authz";

/** Require ALL of the given permissions on the authenticated principal's role. */
export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next): void => {
    const principal = req.principal;
    if (!principal) {
      next(new UnauthenticatedError());
      return;
    }
    for (const permission of permissions) {
      if (!hasPermission(principal.role, permission)) {
        next(new ForbiddenError());
        return;
      }
    }
    next();
  };
}

/** Coarse-grained role guard, consistent with the same principal contract. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next): void => {
    const principal = req.principal;
    if (!principal) {
      next(new UnauthenticatedError());
      return;
    }
    if (!roles.includes(principal.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
