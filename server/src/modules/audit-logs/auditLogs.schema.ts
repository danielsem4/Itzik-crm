import { z } from "zod";

export const listAuditLogsQuerySchema = z
  .object({
    actorUserId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
