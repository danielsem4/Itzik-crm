/**
 * Append-only security audit log.
 *
 * Records actor / action / target / result / timestamp / request metadata.
 * MUST NEVER contain passwords, OTPs, tokens, session secrets, or reset/
 * invitation tokens — `redactMetadata` strips forbidden keys defensively, in
 * addition to callers never passing such values.
 */
import type { PrismaClient, Prisma } from "@prisma/client";

export type AuditResult = "SUCCESS" | "FAILURE";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "INVITATION_CREATED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_EXPIRED"
  | "USER_CREATED"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_DELETED"
  | "ROLE_CHANGED"
  | "SECURITY_SETTINGS_CHANGED"
  | "LOGOUT"
  | "SESSION_REVOKED"
  | "SESSIONS_REVOKED_ALL"
  | "SUPERADMIN_BOOTSTRAP"
  | "SUPERADMIN_RECOVERY"
  | "AUDIT_LOG_READ";

export interface AuditEvent {
  action: AuditAction;
  result: AuditResult;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IAuditLog {
  record(event: AuditEvent): Promise<void>;
}

/** Keys whose presence in metadata indicates a secret that must never be stored. */
const FORBIDDEN_KEY = /pass(word)?|otp|token|secret|csrf|hash|authorization|cookie/i;

/** Drop any metadata key that looks like a secret. Defense in depth. */
export function redactMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEY.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export class PrismaAuditLog implements IAuditLog {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: event.action,
        result: event.result,
        actorUserId: event.actorUserId ?? undefined,
        targetType: event.targetType ?? undefined,
        targetId: event.targetId ?? undefined,
        ip: event.ip ?? undefined,
        userAgent: event.userAgent ?? undefined,
        metadata: (redactMetadata(event.metadata) ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  }
}
