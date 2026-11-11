/**
 * Audit-log read routes. AUDIT_LOG_READ is SUPER_ADMIN-only
 *; every read is itself audited by the service.
 */
import { Router, type RequestHandler } from "express";
import { requirePermission } from "../../shared/middlewares/requirePermission";
import { validateRequest } from "../../shared/middlewares/validateRequest";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { PERMISSIONS } from "../../shared/authz";
import { listAuditLogsQuerySchema } from "./auditLogs.schema";
import type { createAuditLogsController } from "./auditLogs.controller";

export interface AuditLogsRouterDeps {
  controller: ReturnType<typeof createAuditLogsController>;
  authenticate: RequestHandler;
}

export function createAuditLogsRouter(deps: AuditLogsRouterDeps): Router {
  const router = Router();
  router.use("/api/audit-logs", deps.authenticate);
  router.get(
    "/api/audit-logs",
    requirePermission(PERMISSIONS.AUDIT_LOG_READ),
    validateRequest({ query: listAuditLogsQuerySchema }),
    asyncHandler(deps.controller.list)
  );
  return router;
}
