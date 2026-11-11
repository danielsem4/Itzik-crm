/**
 * Server-side session store.
 *
 * The raw session token is generated here and returned ONCE to the caller (to
 * set the cookie); the store persists ONLY its SHA-256 hash. Validity is
 * re-evaluated on every lookup against the idle timeout, absolute lifetime, and
 * revocation — so logout, disablement, and revoke-all take effect on the next
 * request. Behind an interface so the backing store (Postgres now, Redis later)
 * is swappable and services/middleware are unit-testable with an in-memory fake.
 */
import type { PrismaClient, Session } from "@prisma/client";
import { securityPolicy } from "../../config";
import { generateOpaqueToken, sha256Hex } from "../utils/tokens";

export interface SessionCreateInput {
  userId: string;
  /** When the full login completed. */
  authenticatedAt: Date;
  ip?: string;
  userAgent?: string;
  now?: Date;
}

export interface CreatedSession {
  session: Session;
  /** RAW token — set as the cookie value ONCE; never stored or logged. */
  rawToken: string;
}

export interface ISessionStore {
  create(input: SessionCreateInput): Promise<CreatedSession>;
  /** Hash the presented token, look it up, and return it only if still valid. */
  findValidByToken(rawToken: string, now?: Date): Promise<Session | null>;
  /** Slide the idle window. */
  touch(id: string, now?: Date): Promise<void>;
  revoke(id: string, now?: Date): Promise<void>;
  /** Revoke a specific session ONLY if it belongs to `userId`; returns true if revoked. */
  revokeOwned(userId: string, id: string, now?: Date): Promise<boolean>;
  /** Revoke every active session for a user; returns how many were revoked. */
  revokeAllForUser(userId: string, now?: Date): Promise<number>;
  /** Revoke all of a user's active sessions except `keepId` (used on password change). */
  revokeAllForUserExcept(userId: string, keepId: string, now?: Date): Promise<number>;
}

/** True iff the session is not revoked and within both idle and absolute limits. */
export function isSessionValid(session: Session, now: Date): boolean {
  if (session.revokedAt) return false;
  if (now.getTime() > session.expiresAt.getTime()) return false;
  if (now.getTime() - session.lastSeenAt.getTime() > securityPolicy.sessionIdleMs) {
    return false;
  }
  return true;
}

export class PrismaSessionStore implements ISessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: SessionCreateInput): Promise<CreatedSession> {
    const now = input.now ?? new Date();
    const rawToken = generateOpaqueToken(securityPolicy.sessionTokenBytes);
    const csrfToken = generateOpaqueToken(securityPolicy.csrfTokenBytes);
    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash: sha256Hex(rawToken),
        csrfToken,
        authenticatedAt: input.authenticatedAt,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + securityPolicy.sessionAbsoluteMs),
        ip: input.ip,
        userAgent: input.userAgent,
      },
    });
    return { session, rawToken };
  }

  async findValidByToken(rawToken: string, now: Date = new Date()): Promise<Session | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256Hex(rawToken) },
    });
    if (!session) return null;
    return isSessionValid(session, now) ? session : null;
  }

  async touch(id: string, now: Date = new Date()): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { lastSeenAt: now } });
  }

  async revoke(id: string, now: Date = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeOwned(userId: string, id: string, now: Date = new Date()): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count > 0;
  }

  async revokeAllForUser(userId: string, now: Date = new Date()): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count;
  }

  async revokeAllForUserExcept(
    userId: string,
    keepId: string,
    now: Date = new Date()
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: keepId } },
      data: { revokedAt: now },
    });
    return result.count;
  }
}
