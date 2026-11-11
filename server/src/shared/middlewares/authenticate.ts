/**
 * `authenticate` — resolve the opaque session cookie into a trusted Principal
 *. Fail closed: any miss ⇒ 401, never a
 * fall-through to allow.
 *
 * Built as a factory over injected dependencies (session store + a user loader)
 * so it is unit-testable without a database and the backing store stays
 * swappable.
 */
import type { RequestHandler } from "express";
import type { Role, UserStatus } from "@prisma/client";
import { UnauthenticatedError } from "../errors";
import type { ISessionStore } from "../session/sessionStore";
import type { Principal } from "../auth/principal";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  status: UserStatus;
}

export interface AuthenticateDeps {
  sessionStore: ISessionStore;
  /** Load the fresh user record for a session's userId (null if gone). */
  loadUser: (userId: string) => Promise<AuthenticatedUser | null>;
  /** Session cookie name (securityPolicy.sessionCookieName(isProduction)). */
  cookieName: string;
}

export function createAuthenticate(deps: AuthenticateDeps): RequestHandler {
  return async (req, _res, next): Promise<void> => {
    try {
      const raw = req.cookies?.[deps.cookieName];
      if (!raw || typeof raw !== "string") {
        next(new UnauthenticatedError());
        return;
      }

      const session = await deps.sessionStore.findValidByToken(raw);
      if (!session) {
        next(new UnauthenticatedError());
        return;
      }

      // Read role/status FRESH so disablement and role changes are immediate.
      const user = await deps.loadUser(session.userId);
      if (!user || user.status !== "ACTIVE") {
        // Disabled/removed account: make sure this session cannot be reused.
        await deps.sessionStore.revoke(session.id);
        next(new UnauthenticatedError());
        return;
      }

      await deps.sessionStore.touch(session.id);

      const principal: Principal = {
        userId: user.id,
        role: user.role,
        sessionId: session.id,
        status: user.status,
        authenticatedAt: session.authenticatedAt,
      };
      req.principal = principal;
      req.sessionCsrfToken = session.csrfToken;
      next();
    } catch (err) {
      next(err);
    }
  };
}
