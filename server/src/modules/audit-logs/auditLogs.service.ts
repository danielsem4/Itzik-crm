import type { IAuditLog } from "../../shared/audit/auditLog";
import type { AuditLogEntryRecord, IAuditLogsRepository } from "./auditLogs.repository";
import type { ListAuditLogsQuery } from "./auditLogs.schema";

export interface AuditLogEntryDto {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  result: string;
  createdAt: Date;
}

export interface AuditReadContext {
  actorUserId: string;
  ip?: string | null;
  userAgent?: string | null;
}

function toEntryDto(row: AuditLogEntryRecord): AuditLogEntryDto {
  return {
    id: row.id,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    result: row.result,
    createdAt: row.createdAt,
  };
}

export class AuditLogsService {
  constructor(
    private readonly repository: IAuditLogsRepository,
    private readonly audit: IAuditLog
  ) {}

  // Reading the audit log is itself an audited event.
  async list(
    query: ListAuditLogsQuery,
    ctx: AuditReadContext
  ): Promise<{ entries: AuditLogEntryDto[]; total: number; page: number; pageSize: number }> {
    const { rows, total } = await this.repository.findMany({
      actorUserId: query.actorUserId,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    await this.audit.record({
      action: "AUDIT_LOG_READ",
      result: "SUCCESS",
      actorUserId: ctx.actorUserId,
      targetType: query.actorUserId ? "user" : "audit_log",
      targetId: query.actorUserId ?? null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { page: query.page },
    });
    return { entries: rows.map(toEntryDto), total, page: query.page, pageSize: query.pageSize };
  }
}
