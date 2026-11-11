/**
 * HTTP controller (factory) for the auth slice. Maps requests to the service and
 * owns cookie handling. The RAW session token is only ever written to the
 * HttpOnly/Secure/SameSite=Lax session cookie — never returned in a body. The
 * per-session CSRF token IS returned so the SPA can echo it in X-CSRF-Token.
 */
import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { config, securityPolicy } from "../../config";
import type { AuthService, RequestContext } from "./auth.service";
import { listUsersQuerySchema } from "./auth.schema";

function ctx(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.get("user-agent") ?? undefined };
}

export function createAuthController(service: AuthService) {
  const cookieName = securityPolicy.sessionCookieName(config.isProduction);
  const cookieBase = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    path: "/",
  };

  return {
    login: async (req: Request, res: Response): Promise<void> => {
      const { user, rawToken, csrfToken } = await service.login(req.body, ctx(req));
      res.cookie(cookieName, rawToken, {
        ...cookieBase,
        maxAge: securityPolicy.sessionAbsoluteMs,
      });
      res.json({ user, csrfToken });
    },

    me: async (req: Request, res: Response): Promise<void> => {
      const user = await service.getProfile(req.principal!.userId);
      res.json({ user, csrfToken: req.sessionCsrfToken });
    },

    logout: async (req: Request, res: Response): Promise<void> => {
      await service.logout(req.principal!.sessionId, ctx(req), req.principal!.userId);
      res.clearCookie(cookieName, cookieBase);
      res.json({ ok: true });
    },

    revokeSession: async (req: Request, res: Response): Promise<void> => {
      await service.revokeSession(req.principal!.userId, req.body.sessionId, ctx(req));
      res.json({ ok: true });
    },

    revokeAll: async (req: Request, res: Response): Promise<void> => {
      await service.revokeAllSessions(req.principal!.userId, ctx(req));
      res.clearCookie(cookieName, cookieBase);
      res.json({ ok: true });
    },

    forgotPassword: async (req: Request, res: Response): Promise<void> => {
      await service.forgotPassword(req.body);
      // Non-enumerating: identical response whether or not the account exists.
      res.json({ ok: true, message: "If an account exists, an email was sent." });
    },

    resetPassword: async (req: Request, res: Response): Promise<void> => {
      await service.resetPassword(req.body, ctx(req));
      res.json({ ok: true });
    },

    changePassword: async (req: Request, res: Response): Promise<void> => {
      await service.changePassword(
        { userId: req.principal!.userId, sessionId: req.principal!.sessionId },
        req.body,
        ctx(req)
      );
      res.json({ ok: true });
    },

    /** Returns a handler that invites a user with a role fixed by the route. */
    invite: (role: Role) =>
      async (req: Request, res: Response): Promise<void> => {
        const user = await service.inviteUser(
          { userId: req.principal!.userId, role: req.principal!.role },
          {
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            role,
          },
          ctx(req)
        );
        res.status(201).json({ user });
      },

    activate: async (req: Request, res: Response): Promise<void> => {
      const user = await service.activate(req.body, ctx(req));
      res.json({ user });
    },

    /** Returns a handler listing users of a role fixed by the route. */
    listUsers: (role: Role) =>
      async (req: Request, res: Response): Promise<void> => {
        // Re-parse to get coerced/validated values: validateRequest checks the
        // query but cannot write it back (Express 5 query is a getter).
        const { page, pageSize, search } = listUsersQuerySchema.parse(req.query);
        const result = await service.listUsers({ role, page, pageSize, search });
        res.json(result);
      },

    /** Returns a handler fetching one user scoped to a role fixed by the route. */
    getUser: (role: Role) =>
      async (req: Request, res: Response): Promise<void> => {
        const user = await service.getUser(String(req.params.id), role);
        res.json({ user });
      },

    /** Returns a handler deactivating a user of a role fixed by the route. */
    deactivateUser: (role: Role) =>
      async (req: Request, res: Response): Promise<void> => {
        const user = await service.deactivateUser(
          { userId: req.principal!.userId, role: req.principal!.role },
          { id: String(req.params.id), expectedRole: role },
          ctx(req)
        );
        res.json({ user });
      },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
