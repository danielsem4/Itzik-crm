/**
 * Audit-logs module composition root. Mirrors modules/sources/index.ts.
 */
import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { config, securityPolicy } from "../../config";
import { PrismaSessionStore } from "../../shared/session/sessionStore";
import { PrismaAuditLog } from "../../shared/audit/auditLog";
import { createAuthenticate } from "../../shared/middlewares/authenticate";
import { AuditLogsRepository } from "./auditLogs.repository";
import { AuditLogsService } from "./auditLogs.service";
import { createAuditLogsController } from "./auditLogs.controller";
import { createAuditLogsRouter } from "./auditLogs.routes";

export function buildAuditLogsRouter(prisma: PrismaClient): Router {
  const authenticate = createAuthenticate({
    sessionStore: new PrismaSessionStore(prisma),
    loadUser: (userId) =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, status: true },
      }),
    cookieName: securityPolicy.sessionCookieName(config.isProduction),
  });

  const service = new AuditLogsService(new AuditLogsRepository(), new PrismaAuditLog(prisma));
  return createAuditLogsRouter({
    controller: createAuditLogsController(service),
    authenticate,
  });
}
