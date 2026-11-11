/**
 * Auth module composition root. Wires the Prisma-backed repository, session
 * store, audit sink, and email sender into the service/controller, builds the
 * `authenticate` + `csrf` middleware, and returns the mounted router.
 */
import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { config, securityPolicy } from "../../config";
import { PrismaSessionStore } from "../../shared/session/sessionStore";
import { PrismaAuditLog } from "../../shared/audit/auditLog";
import { createEmailSender } from "../../shared/utils/email";
import { createAuthenticate } from "../../shared/middlewares/authenticate";
import { createCsrf } from "../../shared/middlewares/csrf";
import { PrismaAuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { createAuthController } from "./auth.controller";
import { createAuthRouter } from "./auth.routes";

export function buildAuthRouter(prisma: PrismaClient): Router {
  const repo = new PrismaAuthRepository(prisma);
  const sessions = new PrismaSessionStore(prisma);
  const audit = new PrismaAuditLog(prisma);
  const email = createEmailSender(config);

  const service = new AuthService({ repo, sessions, audit, email });
  const controller = createAuthController(service);

  const authenticate = createAuthenticate({
    sessionStore: sessions,
    loadUser: (userId) =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true },
      }),
    cookieName: securityPolicy.sessionCookieName(config.isProduction),
  });
  const csrf = createCsrf({ clientUrl: config.clientUrl });

  return createAuthRouter({ controller, authenticate, csrf });
}

export { AuthService } from "./auth.service";
export { PrismaAuthRepository } from "./auth.repository";
export type { IAuthRepository } from "./auth.repository";
