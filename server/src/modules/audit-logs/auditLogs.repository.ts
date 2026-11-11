import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * The ONLY audit columns ever read for display. `ip`, `userAgent` and `metadata`
 * are deliberately never selected (data minimization):
 * metadata redaction is a blocklist, so it is not safe to surface wholesale.
 */
const ENTRY_SELECT = {
  id: true,
  action: true,
  targetType: true,
  targetId: true,
  result: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type AuditLogEntryRecord = Prisma.AuditLogGetPayload<{ select: typeof ENTRY_SELECT }>;

export interface IAuditLogsRepository {
  findMany(filter: {
    actorUserId?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: AuditLogEntryRecord[]; total: number }>;
}

export class AuditLogsRepository implements IAuditLogsRepository {
  async findMany(filter: {
    actorUserId?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: AuditLogEntryRecord[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = filter.actorUserId
      ? { actorUserId: filter.actorUserId }
      : {};
    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: ENTRY_SELECT,
        orderBy: { createdAt: "desc" },
        skip: filter.skip,
        take: filter.take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { rows, total };
  }
}
