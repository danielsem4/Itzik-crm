import type { Request, Response } from "express";
import type { AuditLogsService } from "./auditLogs.service";
import { listAuditLogsQuerySchema } from "./auditLogs.schema";

export function createAuditLogsController(service: AuditLogsService) {
  return {
    async list(req: Request, res: Response) {
      const query = listAuditLogsQuerySchema.parse(req.query);
      const result = await service.list(query, {
        actorUserId: req.principal!.userId,
        ip: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
      res.json(result);
    },
  };
}
