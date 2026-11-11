import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { Role, UserStatus, type Session } from "@prisma/client";
import {
  UnauthenticatedError,
  ForbiddenError,
  ReauthRequiredError,
} from "../errors";
import { PERMISSIONS } from "../authz";
import type { ISessionStore, CreatedSession } from "../session/sessionStore";
import { createAuthenticate, type AuthenticatedUser } from "./authenticate";
import { requirePermission, requireRole } from "./requirePermission";
import { requireRecentAuth } from "./requireRecentAuth";
import { createCsrf } from "./csrf";
import type { Principal } from "../auth/principal";

// --- Test doubles ---------------------------------------------------------

function makeSession(over: Partial<Session> = {}): Session {
  const now = new Date();
  return {
    id: "sess-1",
    userId: "user-1",
    tokenHash: "hash",
    csrfToken: "csrf-abc",
    authenticatedAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + 3_600_000),
    revokedAt: null,
    ip: null,
    userAgent: null,
    createdAt: now,
    ...over,
  };
}

class FakeSessionStore implements ISessionStore {
  revoked: string[] = [];
  touched: string[] = [];
  constructor(private readonly session: Session | null) {}
  async create(): Promise<CreatedSession> {
    throw new Error("not used in these tests");
  }
  async findValidByToken(rawToken: string): Promise<Session | null> {
    return rawToken === "valid-token" ? this.session : null;
  }
  async touch(id: string): Promise<void> {
    this.touched.push(id);
  }
  async revoke(id: string): Promise<void> {
    this.revoked.push(id);
  }
  async revokeOwned(): Promise<boolean> {
    return false;
  }
  async revokeAllForUser(): Promise<number> {
    return 0;
  }
  async revokeAllForUserExcept(): Promise<number> {
    return 0;
  }
}

function fakeReq(over: Partial<Request> & Record<string, unknown> = {}): Request {
  return {
    cookies: {},
    method: "GET",
    get: () => undefined,
    ...over,
  } as unknown as Request;
}

const noopRes = {} as unknown as Response;

function capture(): { next: (err?: unknown) => void; err: () => unknown; called: () => boolean } {
  let error: unknown;
  let invoked = false;
  return {
    next: (err?: unknown) => {
      invoked = true;
      error = err;
    },
    err: () => error,
    called: () => invoked,
  };
}

const COOKIE = "session";

// --- authenticate ---------------------------------------------------------

test("authenticate: no cookie -> 401 (fail closed)", async () => {
  const store = new FakeSessionStore(makeSession());
  const mw = createAuthenticate({
    sessionStore: store,
    loadUser: async () => ({ id: "user-1", role: Role.EMPLOYEE, status: UserStatus.ACTIVE }),
    cookieName: COOKIE,
  });
  const req = fakeReq({ cookies: {} });
  const c = capture();
  await mw(req, noopRes, c.next);
  assert.ok(c.err() instanceof UnauthenticatedError);
  assert.equal(req.principal, undefined);
});

test("authenticate: valid session + ACTIVE user -> principal attached", async () => {
  const store = new FakeSessionStore(makeSession());
  const mw = createAuthenticate({
    sessionStore: store,
    loadUser: async () => ({ id: "user-1", role: Role.ADMIN, status: UserStatus.ACTIVE }),
    cookieName: COOKIE,
  });
  const req = fakeReq({ cookies: { [COOKIE]: "valid-token" } });
  const c = capture();
  await mw(req, noopRes, c.next);
  assert.equal(c.err(), undefined);
  assert.equal(req.principal?.userId, "user-1");
  assert.equal(req.principal?.role, Role.ADMIN);
  assert.equal(req.principal?.sessionId, "sess-1");
  assert.equal(req.sessionCsrfToken, "csrf-abc");
  assert.deepEqual(store.touched, ["sess-1"]);
});

test("authenticate: DISABLED user -> 401 and session revoked", async () => {
  const store = new FakeSessionStore(makeSession());
  const mw = createAuthenticate({
    sessionStore: store,
    loadUser: async (): Promise<AuthenticatedUser> => ({
      id: "user-1",
      role: Role.EMPLOYEE,
      status: UserStatus.DISABLED,
    }),
    cookieName: COOKIE,
  });
  const req = fakeReq({ cookies: { [COOKIE]: "valid-token" } });
  const c = capture();
  await mw(req, noopRes, c.next);
  assert.ok(c.err() instanceof UnauthenticatedError);
  assert.equal(req.principal, undefined);
  assert.deepEqual(store.revoked, ["sess-1"]);
});

test("authenticate: unknown/invalid token -> 401", async () => {
  const store = new FakeSessionStore(makeSession());
  const mw = createAuthenticate({
    sessionStore: store,
    loadUser: async () => ({ id: "user-1", role: Role.EMPLOYEE, status: UserStatus.ACTIVE }),
    cookieName: COOKIE,
  });
  const req = fakeReq({ cookies: { [COOKIE]: "nope" } });
  const c = capture();
  await mw(req, noopRes, c.next);
  assert.ok(c.err() instanceof UnauthenticatedError);
});

// --- requirePermission / requireRole --------------------------------------

function principal(role: Role, over: Partial<Principal> = {}): Principal {
  return {
    userId: "user-1",
    role,
    sessionId: "sess-1",
    status: UserStatus.ACTIVE,
    authenticatedAt: new Date(),
    ...over,
  };
}

test("requirePermission: no principal -> 401", () => {
  const c = capture();
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE)(fakeReq(), noopRes, c.next);
  assert.ok(c.err() instanceof UnauthenticatedError);
});

test("requirePermission: role lacking permission -> 403", () => {
  const c = capture();
  const req = fakeReq({ principal: principal(Role.EMPLOYEE) });
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE)(req, noopRes, c.next);
  assert.ok(c.err() instanceof ForbiddenError);
});

test("requirePermission: role with permission -> passes", () => {
  const c = capture();
  const req = fakeReq({ principal: principal(Role.ADMIN) });
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE)(req, noopRes, c.next);
  assert.equal(c.err(), undefined);
});

test("requireRole: wrong role -> 403, right role -> passes", () => {
  const a = capture();
  requireRole(Role.SUPER_ADMIN)(fakeReq({ principal: principal(Role.ADMIN) }), noopRes, a.next);
  assert.ok(a.err() instanceof ForbiddenError);

  const b = capture();
  requireRole(Role.ADMIN, Role.SUPER_ADMIN)(
    fakeReq({ principal: principal(Role.ADMIN) }),
    noopRes,
    b.next
  );
  assert.equal(b.err(), undefined);
});

// --- requireRecentAuth ----------------------------------------------------

test("requireRecentAuth: fresh auth passes, stale auth -> REAUTH_REQUIRED", () => {
  const fresh = capture();
  requireRecentAuth(5 * 60_000)(
    fakeReq({ principal: principal(Role.ADMIN, { authenticatedAt: new Date() }) }),
    noopRes,
    fresh.next
  );
  assert.equal(fresh.err(), undefined);

  const stale = capture();
  requireRecentAuth(5 * 60_000)(
    fakeReq({
      principal: principal(Role.ADMIN, {
        authenticatedAt: new Date(Date.now() - 10 * 60_000),
      }),
    }),
    noopRes,
    stale.next
  );
  assert.ok(stale.err() instanceof ReauthRequiredError);
});

// --- csrf -----------------------------------------------------------------

function reqWithHeaders(
  method: string,
  headers: Record<string, string>,
  over: Record<string, unknown> = {}
): Request {
  return fakeReq({
    method,
    get: ((name: string) => headers[name.toLowerCase()]) as Request["get"],
    ...over,
  });
}

const csrf = createCsrf({ clientUrl: "http://localhost:5173" });

test("csrf: safe method (GET) is skipped", () => {
  const c = capture();
  csrf(reqWithHeaders("GET", {}), noopRes, c.next);
  assert.equal(c.err(), undefined);
});

test("csrf: state-changing request with no Origin -> 403", () => {
  const c = capture();
  csrf(reqWithHeaders("POST", {}), noopRes, c.next);
  assert.ok(c.err() instanceof ForbiddenError);
});

test("csrf: cross-origin -> 403", () => {
  const c = capture();
  csrf(
    reqWithHeaders("POST", { origin: "https://evil.example.com", "x-csrf-token": "csrf-abc" }, {
      sessionCsrfToken: "csrf-abc",
    }),
    noopRes,
    c.next
  );
  assert.ok(c.err() instanceof ForbiddenError);
});

test("csrf: matching origin but missing/mismatched token -> 403", () => {
  const missing = capture();
  csrf(
    reqWithHeaders("POST", { origin: "http://localhost:5173" }, { sessionCsrfToken: "csrf-abc" }),
    noopRes,
    missing.next
  );
  assert.ok(missing.err() instanceof ForbiddenError);

  const mismatch = capture();
  csrf(
    reqWithHeaders("POST", { origin: "http://localhost:5173", "x-csrf-token": "wrong" }, {
      sessionCsrfToken: "csrf-abc",
    }),
    noopRes,
    mismatch.next
  );
  assert.ok(mismatch.err() instanceof ForbiddenError);
});

test("csrf: matching origin + matching token -> passes", () => {
  const c = capture();
  csrf(
    reqWithHeaders("POST", { origin: "http://localhost:5173", "x-csrf-token": "csrf-abc" }, {
      sessionCsrfToken: "csrf-abc",
    }),
    noopRes,
    c.next
  );
  assert.equal(c.err(), undefined);
});
