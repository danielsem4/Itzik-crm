/**
 * Auth data access, behind `IAuthRepository` for DI.
 *
 * The service depends only on this interface, so it is unit-testable with an
 * in-memory fake and the persistence layer stays swappable. Sessions live in
 * `shared/session` and audit in `shared/audit`; this repo owns users,
 * invitations, and password-reset tokens.
 */
import type { PrismaClient, Prisma, Role, UserStatus } from "@prisma/client";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  passwordChangedAt: Date | null;
  invitedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationRecord {
  id: string;
  email: string;
  targetRole: Role;
  invitedById: string | null;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface IAuthRepository {
  // Users
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  countActiveSuperAdmins(): Promise<number>;
  listUsersByRole(input: {
    role: Role;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: UserRecord[]; total: number }>;
  setUserStatus(userId: string, status: UserStatus): Promise<UserRecord>;
  /** Minimal display identity for another user (e.g. the inviter). */
  findUserSummaryById(id: string): Promise<{ id: string; name: string } | null>;
  /** Most recent `Session.lastSeenAt` across all of a user's sessions. */
  getLastSessionActivity(userId: string): Promise<Date | null>;
  createInvitedUser(input: {
    email: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    invitedById: string | null;
  }): Promise<UserRecord>;
  activateUser(userId: string, passwordHash: string, now: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string, now: Date): Promise<void>;

  // Invitations
  invalidatePriorInvitations(email: string, now: Date): Promise<void>;
  createInvitation(input: {
    email: string;
    targetRole: Role;
    invitedById: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationRecord>;
  findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null>;
  consumeInvitation(id: string, now: Date): Promise<void>;

  // Password reset tokens
  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetRecord | null>;
  consumePasswordResetToken(id: string, now: Date): Promise<void>;
}

export class PrismaAuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  countActiveSuperAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
  }

  async listUsersByRole(input: {
    role: Role;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: UserRecord[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      role: input.role,
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { email: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: input.skip,
        take: input.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  setUserStatus(userId: string, status: UserStatus): Promise<UserRecord> {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }

  findUserSummaryById(id: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  async getLastSessionActivity(userId: string): Promise<Date | null> {
    const agg = await this.prisma.session.aggregate({
      where: { userId },
      _max: { lastSeenAt: true },
    });
    return agg._max.lastSeenAt ?? null;
  }

  createInvitedUser(input: {
    email: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    invitedById: string | null;
  }): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        status: "INVITED",
        passwordHash: null,
        invitedById: input.invitedById,
      },
    });
  }

  async activateUser(userId: string, passwordHash: string, now: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, status: "ACTIVE", passwordChangedAt: now },
    });
  }

  async updatePassword(userId: string, passwordHash: string, now: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: now },
    });
  }

  async invalidatePriorInvitations(email: string, now: Date): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: now },
    });
  }

  createInvitation(input: {
    email: string;
    targetRole: Role;
    invitedById: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationRecord> {
    return this.prisma.invitation.create({ data: input });
  }

  findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    return this.prisma.invitation.findUnique({ where: { tokenHash } });
  }

  async consumeInvitation(id: string, now: Date): Promise<void> {
    await this.prisma.invitation.update({ where: { id }, data: { consumedAt: now } });
  }

  async createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data: input });
  }

  findPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async consumePasswordResetToken(id: string, now: Date): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id }, data: { consumedAt: now } });
  }
}
