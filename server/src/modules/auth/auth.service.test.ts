import { test } from "node:test";
import assert from "node:assert/strict";
import { Role, UserStatus, type Session } from "@prisma/client";
import {
  UnauthenticatedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors";
import { hashPassword } from "../../shared/utils/password";
import { generateOpaqueToken, sha256Hex } from "../../shared/utils/tokens";
import type { ISessionStore, CreatedSession, SessionCreateInput } from "../../shared/session/sessionStore";
import type { IAuditLog, AuditEvent } from "../../shared/audit/auditLog";
import type { IEmailSender, EmailMessage } from "../../shared/utils/email";
import type {
  IAuthRepository,
  UserRecord,
  InvitationRecord,
  PasswordResetRecord,
} from "./auth.repository";
import { AuthService } from "./auth.service";
import { inviteSchema } from "./auth.schema";

// --- In-memory fakes ------------------------------------------------------

let seq = 0;
const nextId = (): string => `id-${(seq += 1)}`;

function userRecord(over: Partial<UserRecord>): UserRecord {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: nextId(),
    email: "user@example.com",
    passwordHash: null,
    name: "Test User",
    firstName: null,
    lastName: null,
    phone: null,
    role: Role.EMPLOYEE,
    status: UserStatus.ACTIVE,
    passwordChangedAt: null,
    invitedById: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

class FakeAuthRepo implements IAuthRepository {
  users = new Map<string, UserRecord>();
  invitations = new Map<string, InvitationRecord>();
  resets = new Map<string, PasswordResetRecord>();

  seed(user: UserRecord): UserRecord {
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }
  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
  async countActiveSuperAdmins(): Promise<number> {
    let n = 0;
    for (const u of this.users.values())
      if (u.role === Role.SUPER_ADMIN && u.status === UserStatus.ACTIVE) n += 1;
    return n;
  }
  async listUsersByRole(input: {
    role: Role;
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ rows: UserRecord[]; total: number }> {
    const term = input.search?.toLowerCase();
    const matched = [...this.users.values()]
      .filter((u) => u.role === input.role)
      .filter(
        (u) =>
          !term ||
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { rows: matched.slice(input.skip, input.skip + input.take), total: matched.length };
  }
  async setUserStatus(userId: string, status: UserStatus): Promise<UserRecord> {
    const u = this.users.get(userId)!;
    u.status = status;
    return u;
  }
  lastActivity = new Map<string, Date>();
  async findUserSummaryById(id: string): Promise<{ id: string; name: string } | null> {
    const u = this.users.get(id);
    return u ? { id: u.id, name: u.name } : null;
  }
  async getLastSessionActivity(userId: string): Promise<Date | null> {
    return this.lastActivity.get(userId) ?? null;
  }
  async createInvitedUser(input: {
    email: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    invitedById: string | null;
  }): Promise<UserRecord> {
    return this.seed(
      userRecord({ ...input, status: UserStatus.INVITED, passwordHash: null })
    );
  }
  async activateUser(userId: string, passwordHash: string, now: Date): Promise<void> {
    const u = this.users.get(userId)!;
    u.passwordHash = passwordHash;
    u.status = UserStatus.ACTIVE;
    u.passwordChangedAt = now;
  }
  async updatePassword(userId: string, passwordHash: string, now: Date): Promise<void> {
    const u = this.users.get(userId)!;
    u.passwordHash = passwordHash;
    u.passwordChangedAt = now;
  }
  async invalidatePriorInvitations(email: string, now: Date): Promise<void> {
    for (const inv of this.invitations.values())
      if (inv.email === email && !inv.consumedAt) inv.consumedAt = now;
  }
  async createInvitation(input: {
    email: string;
    targetRole: Role;
    invitedById: string | null;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationRecord> {
    const rec: InvitationRecord = {
      id: nextId(),
      ...input,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.invitations.set(rec.id, rec);
    return rec;
  }
  async findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    for (const inv of this.invitations.values()) if (inv.tokenHash === tokenHash) return inv;
    return null;
  }
  async consumeInvitation(id: string, now: Date): Promise<void> {
    this.invitations.get(id)!.consumedAt = now;
  }
  async createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const rec: PasswordResetRecord = {
      id: nextId(),
      ...input,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.resets.set(rec.id, rec);
  }
  async findPasswordResetByTokenHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    for (const r of this.resets.values()) if (r.tokenHash === tokenHash) return r;
    return null;
  }
  async consumePasswordResetToken(id: string, now: Date): Promise<void> {
    this.resets.get(id)!.consumedAt = now;
  }
}

class FakeSessions implements ISessionStore {
  sessions = new Map<string, Session>();
  private tokenToId = new Map<string, string>();

  async create(input: SessionCreateInput): Promise<CreatedSession> {
    const now = input.now ?? new Date();
    const rawToken = generateOpaqueToken(32);
    const session: Session = {
      id: nextId(),
      userId: input.userId,
      tokenHash: sha256Hex(rawToken),
      csrfToken: generateOpaqueToken(32),
      authenticatedAt: input.authenticatedAt,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 8 * 3_600_000),
      revokedAt: null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: now,
    };
    this.sessions.set(session.id, session);
    this.tokenToId.set(session.tokenHash, session.id);
    return { session, rawToken };
  }
  async findValidByToken(rawToken: string): Promise<Session | null> {
    const id = this.tokenToId.get(sha256Hex(rawToken));
    const s = id ? this.sessions.get(id) : undefined;
    return s && !s.revokedAt ? s : null;
  }
  async touch(): Promise<void> {}
  async revoke(id: string, now: Date = new Date()): Promise<void> {
    const s = this.sessions.get(id);
    if (s && !s.revokedAt) s.revokedAt = now;
  }
  async revokeOwned(userId: string, id: string, now: Date = new Date()): Promise<boolean> {
    const s = this.sessions.get(id);
    if (s && s.userId === userId && !s.revokedAt) {
      s.revokedAt = now;
      return true;
    }
    return false;
  }
  async revokeAllForUser(userId: string, now: Date = new Date()): Promise<number> {
    let n = 0;
    for (const s of this.sessions.values())
      if (s.userId === userId && !s.revokedAt) {
        s.revokedAt = now;
        n += 1;
      }
    return n;
  }
  async revokeAllForUserExcept(
    userId: string,
    keepId: string,
    now: Date = new Date()
  ): Promise<number> {
    let n = 0;
    for (const s of this.sessions.values())
      if (s.userId === userId && s.id !== keepId && !s.revokedAt) {
        s.revokedAt = now;
        n += 1;
      }
    return n;
  }
  activeCount(userId: string): number {
    let n = 0;
    for (const s of this.sessions.values()) if (s.userId === userId && !s.revokedAt) n += 1;
    return n;
  }
}

class FakeAudit implements IAuditLog {
  events: AuditEvent[] = [];
  async record(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

class FakeEmail implements IEmailSender {
  sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
  last(): EmailMessage {
    return this.sent[this.sent.length - 1]!;
  }
}

interface Harness {
  service: AuthService;
  repo: FakeAuthRepo;
  sessions: FakeSessions;
  audit: FakeAudit;
  email: FakeEmail;
  setNow: (d: Date) => void;
}

function harness(): Harness {
  const repo = new FakeAuthRepo();
  const sessions = new FakeSessions();
  const audit = new FakeAudit();
  const email = new FakeEmail();
  let current = new Date("2026-01-01T00:00:00Z");
  const service = new AuthService({ repo, sessions, audit, email, now: () => current });
  return { service, repo, sessions, audit, email, setNow: (d) => (current = d) };
}

const PASSWORD = "Sup3r-Secret-Passw0rd!";
let cachedHash: string | null = null;
async function seedActive(repo: FakeAuthRepo, over: Partial<UserRecord> = {}): Promise<UserRecord> {
  cachedHash ??= await hashPassword(PASSWORD);
  return repo.seed(userRecord({ passwordHash: cachedHash, status: UserStatus.ACTIVE, ...over }));
}

// --- Tests: login ---------------------------------------------------------

test("correct password creates a session; audit has no secrets", async () => {
  const h = harness();
  const user = await seedActive(h.repo, { email: "b@example.com" });
  const result = await h.service.login({ email: "b@example.com", password: PASSWORD }, {});
  assert.equal(result.user.id, user.id);
  assert.ok(result.rawToken && result.csrfToken);
  assert.equal(h.sessions.activeCount(user.id), 1);
  const blob = JSON.stringify(h.audit.events);
  assert.ok(!blob.includes(result.rawToken));
  assert.ok(!blob.includes(PASSWORD));
});

test("wrong password creates NO session", async () => {
  const h = harness();
  const user = await seedActive(h.repo, { email: "c@example.com" });
  await assert.rejects(
    () => h.service.login({ email: "c@example.com", password: "wrong-password-here" }, {}),
    UnauthenticatedError
  );
  assert.equal(h.sessions.activeCount(user.id), 0);
});

// --- Tests: account status & enumeration ----------------------------------

test("DISABLED user cannot login (generic error, no session)", async () => {
  const h = harness();
  await seedActive(h.repo, { email: "h@example.com", status: UserStatus.DISABLED });
  await assert.rejects(
    () => h.service.login({ email: "h@example.com", password: PASSWORD }, {}),
    UnauthenticatedError
  );
  assert.equal(h.sessions.sessions.size, 0);
});

test("INVITED user (no password) cannot login", async () => {
  const h = harness();
  h.repo.seed(userRecord({ email: "i@example.com", status: UserStatus.INVITED, passwordHash: null }));
  await assert.rejects(
    () => h.service.login({ email: "i@example.com", password: PASSWORD }, {}),
    UnauthenticatedError
  );
});

test("login is non-enumerating: unknown email and wrong password fail identically", async () => {
  const h = harness();
  await seedActive(h.repo, { email: "j@example.com" });
  let unknownMsg = "";
  let wrongMsg = "";
  try {
    await h.service.login({ email: "does-not-exist@example.com", password: PASSWORD }, {});
  } catch (err) {
    unknownMsg = (err as Error).message;
  }
  try {
    await h.service.login({ email: "j@example.com", password: "wrong-password-here" }, {});
  } catch (err) {
    wrongMsg = (err as Error).message;
  }
  assert.equal(unknownMsg, wrongMsg);
  assert.equal(unknownMsg, "Invalid email or password");
});

// --- Tests: sessions ------------------------------------------------------

async function loginFully(h: Harness, email: string): Promise<{ userId: string; sessionId: string }> {
  const user = await seedActive(h.repo, { email });
  await h.service.login({ email, password: PASSWORD }, {});
  const session = [...h.sessions.sessions.values()].find((s) => s.userId === user.id && !s.revokedAt)!;
  return { userId: user.id, sessionId: session.id };
}

test("logout revokes the current session", async () => {
  const h = harness();
  const { userId, sessionId } = await loginFully(h, "k@example.com");
  await h.service.logout(sessionId, {}, userId);
  assert.equal(h.sessions.activeCount(userId), 0);
});

test("revoke-all kills every session for the user", async () => {
  const h = harness();
  const { userId } = await loginFully(h, "l@example.com");
  // second device
  await h.sessions.create({ userId, authenticatedAt: new Date() });
  assert.equal(h.sessions.activeCount(userId), 2);
  await h.service.revokeAllSessions(userId, {});
  assert.equal(h.sessions.activeCount(userId), 0);
});

// --- Tests: passwords -----------------------------------------------------

test("password reset consumes a single-use token and revokes ALL sessions", async () => {
  const h = harness();
  const { userId } = await loginFully(h, "m@example.com");
  assert.equal(h.sessions.activeCount(userId), 1);
  await h.service.forgotPassword({ email: "m@example.com" });
  const link = h.email.last().text.match(/token=([A-Za-z0-9_-]+)/);
  const token = link![1]!;
  await h.service.resetPassword({ token, password: "A-Brand-New-Passw0rd!" }, {});
  assert.equal(h.sessions.activeCount(userId), 0, "reset revokes all sessions");
  // token is single-use
  await assert.rejects(
    () => h.service.resetPassword({ token, password: "Another-New-Passw0rd!" }, {}),
    BadRequestError
  );
});

test("forgot-password for unknown email is a silent no-op (non-enumerating)", async () => {
  const h = harness();
  await h.service.forgotPassword({ email: "nobody@example.com" });
  assert.equal(h.email.sent.length, 0);
  assert.equal(h.repo.resets.size, 0);
});

test("change password keeps the current session, revokes the others", async () => {
  const h = harness();
  const { userId, sessionId } = await loginFully(h, "n@example.com");
  await h.sessions.create({ userId, authenticatedAt: new Date() }); // other device
  assert.equal(h.sessions.activeCount(userId), 2);
  await h.service.changePassword({ userId, sessionId }, { currentPassword: PASSWORD, newPassword: "Yet-Another-Passw0rd!" }, {});
  assert.equal(h.sessions.activeCount(userId), 1);
  assert.equal(h.sessions.sessions.get(sessionId)!.revokedAt, null);
});

test("change password rejects a wrong current password", async () => {
  const h = harness();
  const { userId, sessionId } = await loginFully(h, "o@example.com");
  await assert.rejects(
    () =>
      h.service.changePassword(
        { userId, sessionId },
        { currentPassword: "not-the-password", newPassword: "Whatever-Passw0rd!" },
        {}
      ),
    UnauthenticatedError
  );
});

// --- Tests: provisioning / privilege escalation ---------------------------

test("ADMIN can invite an EMPLOYEE", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "admin@example.com", role: Role.ADMIN });
  const dto = await h.service.inviteUser(
    { userId: admin.id, role: Role.ADMIN },
    { email: "newemp@example.com", firstName: "New", lastName: "Emp", phone: "+1 555 0100", role: Role.EMPLOYEE },
    {}
  );
  assert.equal(dto.role, Role.EMPLOYEE);
  assert.equal(dto.status, UserStatus.INVITED);
  // Phone is stored but never returned in the DTO (data minimization).
  assert.equal("phone" in dto, false);
  assert.equal(h.repo.users.get(dto.id)?.phone, "+1 555 0100");
});

test("ADMIN cannot create an ADMIN, and cannot assign SUPER_ADMIN", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "admin2@example.com", role: Role.ADMIN });
  await assert.rejects(
    () =>
      h.service.inviteUser(
        { userId: admin.id, role: Role.ADMIN },
        { email: "x@example.com", firstName: "Ex", lastName: "Ample", phone: "+1 555 0101", role: Role.ADMIN },
        {}
      ),
    ForbiddenError
  );
  await assert.rejects(
    () =>
      h.service.inviteUser(
        { userId: admin.id, role: Role.ADMIN },
        { email: "y@example.com", firstName: "Why", lastName: "Not", phone: "+1 555 0102", role: Role.SUPER_ADMIN },
        {}
      ),
    ForbiddenError
  );
});

test("EMPLOYEE cannot create any user", async () => {
  const h = harness();
  const emp = await seedActive(h.repo, { email: "emp@example.com", role: Role.EMPLOYEE });
  await assert.rejects(
    () =>
      h.service.inviteUser(
        { userId: emp.id, role: Role.EMPLOYEE },
        { email: "z@example.com", firstName: "Zed", lastName: "Zero", phone: "+1 555 0103", role: Role.EMPLOYEE },
        {}
      ),
    ForbiddenError
  );
});

test("no actor may create a SUPER_ADMIN via the service", async () => {
  const h = harness();
  const su = await seedActive(h.repo, { email: "su@example.com", role: Role.SUPER_ADMIN });
  await assert.rejects(
    () =>
      h.service.inviteUser(
        { userId: su.id, role: Role.SUPER_ADMIN },
        { email: "w@example.com", firstName: "Dub", lastName: "Ya", phone: "+1 555 0104", role: Role.SUPER_ADMIN },
        {}
      ),
    ForbiddenError
  );
});

test("inviting an existing email conflicts", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "admin3@example.com", role: Role.ADMIN });
  await seedActive(h.repo, { email: "dup@example.com", role: Role.EMPLOYEE });
  await assert.rejects(
    () =>
      h.service.inviteUser(
        { userId: admin.id, role: Role.ADMIN },
        { email: "dup@example.com", firstName: "Du", lastName: "Plicate", phone: "+1 555 0105", role: Role.EMPLOYEE },
        {}
      ),
    ConflictError
  );
});

test("inviteSchema rejects an injected role field (no mass-assign)", () => {
  const parsed = inviteSchema.safeParse({
    email: "p@example.com",
    firstName: "Pea",
    lastName: "Cock",
    phone: "+1 555 0108",
    role: "ADMIN",
  });
  assert.equal(parsed.success, false);
});

test("inviteSchema rejects separator-only or too-short phone numbers", () => {
  for (const phone of ["+++", "---", "( )", "123456", "1".repeat(16)]) {
    const parsed = inviteSchema.safeParse({
      email: "p@example.com",
      firstName: "Pea",
      lastName: "Cock",
      phone,
    });
    assert.equal(parsed.success, false, `expected "${phone}" to be rejected`);
  }
});

test("inviteSchema accepts a valid Israeli phone number", () => {
  const parsed = inviteSchema.safeParse({
    email: "p@example.com",
    firstName: "Pea",
    lastName: "Cock",
    phone: "+972 50-123-4567",
  });
  assert.equal(parsed.success, true);
});

// --- Tests: invitation / activation ---------------------------------------

test("activation sets a password + ACTIVE, is single-use, and creates NO session", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "admin4@example.com", role: Role.ADMIN });
  await h.service.inviteUser(
    { userId: admin.id, role: Role.ADMIN },
    { email: "invitee@example.com", firstName: "In", lastName: "Vitee", phone: "+1 555 0106", role: Role.EMPLOYEE },
    {}
  );
  const token = h.email.last().text.match(/token=([A-Za-z0-9_-]+)/)![1]!;
  const dto = await h.service.activate({ token, password: "Activation-Passw0rd!" }, {});
  assert.equal(dto.status, UserStatus.ACTIVE);
  assert.equal(h.sessions.sessions.size, 0, "activation creates no session");
  // The activated user can now log in.
  const login = await h.service.login({ email: "invitee@example.com", password: "Activation-Passw0rd!" }, {});
  assert.ok(login.rawToken);
  // Token is single-use.
  await assert.rejects(
    () => h.service.activate({ token, password: "Second-Passw0rd!" }, {}),
    BadRequestError
  );
});

test("expired invitation is rejected", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "admin5@example.com", role: Role.ADMIN });
  await h.service.inviteUser(
    { userId: admin.id, role: Role.ADMIN },
    { email: "late@example.com", firstName: "La", lastName: "Te", phone: "+1 555 0107", role: Role.EMPLOYEE },
    {}
  );
  const token = h.email.last().text.match(/token=([A-Za-z0-9_-]+)/)![1]!;
  h.setNow(new Date("2026-01-05T00:00:00Z")); // > 72h later
  await assert.rejects(
    () => h.service.activate({ token, password: "Too-Late-Passw0rd!" }, {}),
    BadRequestError
  );
});

// --- Tests: user detail DTO ------------------------------------------------

test("getUser returns inviter summary + last activity, and never phone/secrets", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "inviter@example.com", role: Role.ADMIN, name: "Ina Viter" });
  const employee = await seedActive(h.repo, {
    email: "doc-detail@example.com",
    phone: "+972 50 000 0000",
    invitedById: admin.id,
  });
  const seen = new Date("2026-02-02T10:00:00Z");
  h.repo.lastActivity.set(employee.id, seen);

  const dto = await h.service.getUser(employee.id, Role.EMPLOYEE);
  assert.deepEqual(dto.invitedBy, { id: admin.id, name: "Ina Viter" });
  assert.equal(dto.lastActiveAt, seen);
  assert.deepEqual(Object.keys(dto).sort(), [
    "createdAt", "email", "firstName", "id", "invitedBy", "lastActiveAt",
    "lastName", "name", "role", "status",
  ]);
});

test("getUser: missing inviter and no sessions yield nulls", async () => {
  const h = harness();
  const employee = await seedActive(h.repo, { email: "orphan@example.com", invitedById: "gone" });
  const dto = await h.service.getUser(employee.id, Role.EMPLOYEE);
  assert.equal(dto.invitedBy, null);
  assert.equal(dto.lastActiveAt, null);
});

test("getUser: wrong role for the screen is a 404", async () => {
  const h = harness();
  const admin = await seedActive(h.repo, { email: "not-a-emp@example.com", role: Role.ADMIN });
  await assert.rejects(() => h.service.getUser(admin.id, Role.EMPLOYEE), NotFoundError);
});
