/**
 * Authentication / account-lifecycle business logic.
 *
 * Pure of HTTP and Prisma: depends only on injected interfaces (repository,
 * session store, audit sink, email sender) plus a clock, so it is fully
 * testable against in-memory fakes. Security invariants enforced here:
 *  - login/reset are non-enumerating;
 *  - bearer secrets are hashed; nothing sensitive is logged;
 *  - role assignment obeys canAssignRole (no privilege escalation, no SUPER_ADMIN).
 */
import {
  UnauthenticatedError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { canAssignRole } from "../../shared/authz";
import { securityPolicy, config } from "../../config";
import {
  hashPassword,
  verifyPassword,
  dummyVerify,
} from "../../shared/utils/password";
import { generateOpaqueToken, sha256Hex } from "../../shared/utils/tokens";
import type { ISessionStore } from "../../shared/session/sessionStore";
import type { IAuditLog } from "../../shared/audit/auditLog";
import type { IEmailSender } from "../../shared/utils/email";
import type { Role } from "@prisma/client";
import type { IAuthRepository, UserRecord } from "./auth.repository";

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  // `phone` is deliberately NOT in the DTO (data minimization):
  // it is stored but no screen needs it yet. Expose it via a dedicated,
  // permission-gated endpoint when one does.
  role: Role;
  status: UserRecord["status"];
  createdAt: Date;
}

/**
 * Detail view of a managed user (Employees/Admins detail screens). Adds context
 * the list doesn't need; still excludes `phone`, and the inviter is exposed as
 * `{ id, name }` only (no inviter email).
 */
export interface UserDetailDto extends UserDto {
  invitedBy: { id: string; name: string } | null;
  lastActiveAt: Date | null;
}

export interface LoginResult {
  user: UserDto;
  /** RAW session token — the controller sets it as the cookie ONCE. */
  rawToken: string;
  /** Per-session CSRF token for the SPA to echo in X-CSRF-Token. */
  csrfToken: string;
}

export interface AuthServiceDeps {
  repo: IAuthRepository;
  sessions: ISessionStore;
  audit: IAuditLog;
  email: IEmailSender;
  now?: () => Date;
}

function toDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  private readonly repo: IAuthRepository;
  private readonly sessions: ISessionStore;
  private readonly audit: IAuditLog;
  private readonly email: IEmailSender;
  private readonly now: () => Date;

  constructor(deps: AuthServiceDeps) {
    this.repo = deps.repo;
    this.sessions = deps.sessions;
    this.audit = deps.audit;
    this.email = deps.email;
    this.now = deps.now ?? ((): Date => new Date());
  }

  async login(
    input: { email: string; password: string },
    ctx: RequestContext
  ): Promise<LoginResult> {
    const now = this.now();
    const user = await this.repo.findUserByEmail(input.email);
    const canLogin = !!user && user.status === "ACTIVE" && !!user.passwordHash;

    // Constant-workish: always run a bcrypt comparison so timing does not reveal
    // whether the account exists / is active.
    const ok = canLogin
      ? await verifyPassword(input.password, user!.passwordHash!)
      : (await dummyVerify(input.password), false);

    if (!ok) {
      await this.audit.record({
        action: "LOGIN_FAILURE",
        result: "FAILURE",
        actorUserId: user?.id ?? null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      // Identical response regardless of which condition failed (no enumeration).
      throw new UnauthenticatedError("Invalid email or password");
    }

    const { session, rawToken } = await this.sessions.create({
      userId: user!.id,
      authenticatedAt: now,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      now,
    });
    await this.audit.record({
      action: "LOGIN_SUCCESS",
      result: "SUCCESS",
      actorUserId: user!.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { user: toDto(user!), rawToken, csrfToken: session.csrfToken };
  }

  // --- Session lifecycle --------------------------------------------------

  async logout(sessionId: string, ctx: RequestContext, actorUserId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
    await this.audit.record({
      action: "LOGOUT",
      result: "SUCCESS",
      actorUserId,
      targetType: "session",
      targetId: sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async revokeSession(userId: string, sessionId: string, ctx: RequestContext): Promise<void> {
    const revoked = await this.sessions.revokeOwned(userId, sessionId);
    if (!revoked) throw new NotFoundError("Session not found");
    await this.audit.record({
      action: "SESSION_REVOKED",
      result: "SUCCESS",
      actorUserId: userId,
      targetType: "session",
      targetId: sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async revokeAllSessions(userId: string, ctx: RequestContext): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
    await this.audit.record({
      action: "SESSIONS_REVOKED_ALL",
      result: "SUCCESS",
      actorUserId: userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  // --- Passwords ----------------------------------------------------------

  async forgotPassword(input: { email: string }): Promise<void> {
    const now = this.now();
    const user = await this.repo.findUserByEmail(input.email);
    // Non-enumerating: do the work only for a real active account, but the caller
    // always receives the same generic response.
    if (user && user.status === "ACTIVE") {
      const rawToken = generateOpaqueToken(securityPolicy.resetTokenBytes);
      await this.repo.createPasswordResetToken({
        userId: user.id,
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(now.getTime() + securityPolicy.passwordResetTtlMs),
      });
      await this.email.send({
        to: user.email,
        subject: "Reset your password",
        text:
          `Use this link to reset your password (valid for 60 minutes):\n` +
          `${config.clientUrl}/reset-password?token=${rawToken}\n\n` +
          `If you did not request this, you can ignore this email.`,
      });
    }
  }

  async resetPassword(
    input: { token: string; password: string },
    ctx: RequestContext
  ): Promise<void> {
    const now = this.now();
    const record = await this.repo.findPasswordResetByTokenHash(sha256Hex(input.token));
    if (
      !record ||
      record.consumedAt !== null ||
      record.expiresAt.getTime() < now.getTime()
    ) {
      throw new BadRequestError("Invalid or expired reset token");
    }
    const passwordHash = await hashPassword(input.password);
    await this.repo.updatePassword(record.userId, passwordHash, now);
    await this.repo.consumePasswordResetToken(record.id, now);
    // A reset invalidates every session — the user logs in again.
    await this.sessions.revokeAllForUser(record.userId);
    await this.audit.record({
      action: "PASSWORD_RESET",
      result: "SUCCESS",
      actorUserId: record.userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async changePassword(
    actor: { userId: string; sessionId: string },
    input: { currentPassword: string; newPassword: string },
    ctx: RequestContext
  ): Promise<void> {
    const now = this.now();
    const user = await this.repo.findUserById(actor.userId);
    if (!user || !user.passwordHash) {
      throw new UnauthenticatedError("Authentication required");
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new UnauthenticatedError("Current password is incorrect");
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.repo.updatePassword(user.id, passwordHash, now);
    // Keep the acting session; revoke the user's other sessions.
    await this.sessions.revokeAllForUserExcept(user.id, actor.sessionId);
    await this.audit.record({
      action: "PASSWORD_CHANGED",
      result: "SUCCESS",
      actorUserId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  // --- Provisioning -------------------------------------------------------

  async inviteUser(
    actor: { userId: string; role: Role },
    input: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      role: Role;
    },
    ctx: RequestContext
  ): Promise<UserDto> {
    // Privilege-escalation guard: SUPER_ADMIN->{ADMIN,EMPLOYEE}, ADMIN->{EMPLOYEE},
    // nobody can assign SUPER_ADMIN. Defense in depth on top of the route's
    // requirePermission gate.
    if (!canAssignRole(actor.role, input.role)) {
      throw new ForbiddenError("You may not create a user with that role");
    }
    const now = this.now();
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    // `name` is the derived display/search field; firstName/lastName are source of truth.
    const name = `${input.firstName} ${input.lastName}`.trim();
    const user = await this.repo.createInvitedUser({
      email: input.email,
      name,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
      invitedById: actor.userId,
    });

    const rawToken = generateOpaqueToken(securityPolicy.invitationTokenBytes);
    await this.repo.invalidatePriorInvitations(input.email, now);
    await this.repo.createInvitation({
      email: input.email,
      targetRole: input.role,
      invitedById: actor.userId,
      tokenHash: sha256Hex(rawToken),
      expiresAt: new Date(now.getTime() + securityPolicy.invitationTtlMs),
    });
    await this.email.send({
      to: input.email,
      subject: "You have been invited",
      text:
        `You have been invited to Itzik CRM. Activate your account and set ` +
        `a password (link valid for 72 hours):\n` +
        `${config.clientUrl}/activate?token=${rawToken}\n`,
    });
    await this.audit.record({
      action: "USER_CREATED",
      result: "SUCCESS",
      actorUserId: actor.userId,
      targetType: "user",
      targetId: user.id,
      metadata: { role: input.role },
    });
    await this.audit.record({
      action: "INVITATION_CREATED",
      result: "SUCCESS",
      actorUserId: actor.userId,
      targetType: "user",
      targetId: user.id,
    });
    return toDto(user);
  }

  // --- User directory (Admins / Employees management screens) -------------

  /** Paginated, optionally-searched list of users with a given role. */
  async listUsers(input: {
    role: Role;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<{ users: UserDto[]; total: number; page: number; pageSize: number }> {
    const { role, search, page, pageSize } = input;
    const { rows, total } = await this.repo.listUsersByRole({
      role,
      search,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { users: rows.map(toDto), total, page, pageSize };
  }

  /** Fetch one user, scoped to the role of the screen it is viewed from. */
  async getUser(id: string, expectedRole: Role): Promise<UserDetailDto> {
    const user = await this.repo.findUserById(id);
    if (!user || user.role !== expectedRole) throw new NotFoundError("User not found");
    const [invitedBy, lastActiveAt] = await Promise.all([
      user.invitedById ? this.repo.findUserSummaryById(user.invitedById) : null,
      this.repo.getLastSessionActivity(user.id),
    ]);
    return { ...toDto(user), invitedBy, lastActiveAt };
  }

  /**
   * Soft-disable a user (status -> DISABLED) and revoke their sessions. The
   * route's requirePermission gate decides WHO may do this; here we enforce the
   * invariants: the target must actually hold `expectedRole` (so an Employees
   * screen can never touch an ADMIN/SUPER_ADMIN), and nobody may disable
   * themselves. `authenticate` reads status fresh, so the effect is immediate.
   */
  async deactivateUser(
    actor: { userId: string; role: Role },
    input: { id: string; expectedRole: Role },
    ctx: RequestContext
  ): Promise<UserDto> {
    const user = await this.repo.findUserById(input.id);
    if (!user || user.role !== input.expectedRole) throw new NotFoundError("User not found");
    if (user.id === actor.userId) {
      throw new ForbiddenError("You cannot deactivate your own account");
    }
    if (user.status === "DISABLED") return toDto(user); // idempotent

    const updated = await this.repo.setUserStatus(user.id, "DISABLED");
    await this.sessions.revokeAllForUser(user.id);
    await this.audit.record({
      action: "USER_DISABLED",
      result: "SUCCESS",
      actorUserId: actor.userId,
      targetType: "user",
      targetId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { role: user.role },
    });
    return toDto(updated);
  }

  async activate(
    input: { token: string; password: string },
    ctx: RequestContext
  ): Promise<UserDto> {
    const now = this.now();
    const invitation = await this.repo.findInvitationByTokenHash(sha256Hex(input.token));
    if (!invitation || invitation.consumedAt !== null) {
      throw new BadRequestError("Invalid or expired invitation");
    }
    if (invitation.expiresAt.getTime() < now.getTime()) {
      await this.audit.record({
        action: "INVITATION_EXPIRED",
        result: "FAILURE",
        targetType: "invitation",
        targetId: invitation.id,
      });
      throw new BadRequestError("Invalid or expired invitation");
    }
    const user = await this.repo.findUserByEmail(invitation.email);
    if (!user || user.status !== "INVITED") {
      throw new BadRequestError("Invalid or expired invitation");
    }

    const passwordHash = await hashPassword(input.password);
    await this.repo.activateUser(user.id, passwordHash, now);
    await this.repo.consumeInvitation(invitation.id, now);
    await this.audit.record({
      action: "INVITATION_ACCEPTED",
      result: "SUCCESS",
      actorUserId: user.id,
      targetType: "user",
      targetId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    // Activation creates NO session — the user logs in normally.
    return toDto({ ...user, status: "ACTIVE" });
  }

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    return toDto(user);
  }
}
