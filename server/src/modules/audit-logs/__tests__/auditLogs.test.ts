import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type { Role } from "@prisma/client";
import { AuditLogsService } from "../auditLogs.service";
import { createAuditLogsController } from "../auditLogs.controller";
import { createAuditLogsRouter } from "../auditLogs.routes";
import type { IAuditLogsRepository } from "../auditLogs.repository";
import type { AuditEvent, IAuditLog } from "../../../shared/audit/auditLog";
import { errorHandler } from "../../../shared/middlewares/errorHandler";
import { UnauthenticatedError } from "../../../shared/errors";
// Loads the `req.principal` Express augmentation for this file's compile graph.
import "../../../shared/auth/principal";

const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";

function harness() {
  const recorded: AuditEvent[] = [];
  const audit: IAuditLog = { record: (e) => (recorded.push(e), Promise.resolve()) };
  const repo: IAuditLogsRepository = {
    findMany: () =>
      Promise.resolve({
        rows: [
          {
            id: "a1",
            action: "LOGIN_SUCCESS",
            targetType: "user",
            targetId: EMPLOYEE_ID,
            result: "SUCCESS",
            createdAt: new Date(0),
            // Simulates a repository regression that over-selects: the DTO
            // mapper must still drop these.
            ip: "10.0.0.1",
            userAgent: "curl",
            metadata: { email: "x@y" },
          } as never,
        ],
        total: 1,
      }),
  };
  return { service: new AuditLogsService(repo, audit), recorded };
}

test("service: every read is audited and the DTO omits ip/userAgent/metadata", async () => {
  const h = harness();
  const res = await h.service.list(
    { actorUserId: EMPLOYEE_ID, page: 1, pageSize: 20 },
    { actorUserId: "super-1" }
  );
  assert.deepEqual(Object.keys(res.entries[0]!).sort(), [
    "action", "createdAt", "id", "result", "targetId", "targetType",
  ]);
  assert.equal(h.recorded.length, 1);
  assert.equal(h.recorded[0]!.action, "AUDIT_LOG_READ");
  assert.equal(h.recorded[0]!.actorUserId, "super-1");
  assert.equal(h.recorded[0]!.targetId, EMPLOYEE_ID);
});

const fakeAuthenticate: RequestHandler = (req, _res, next) => {
  const role = req.get("x-test-role") as Role | undefined;
  if (!role) return next(new UnauthenticatedError());
  req.principal = { userId: "u", role, sessionId: "s", status: "ACTIVE", authenticatedAt: new Date() };
  next();
};

test("routes: only SUPER_ADMIN may read the audit log", async () => {
  const h = harness();
  const app = express();
  app.use(
    createAuditLogsRouter({
      controller: createAuditLogsController(h.service),
      authenticate: fakeAuthenticate,
    })
  );
  app.use(errorHandler);
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/api/audit-logs?actorUserId=${EMPLOYEE_ID}`;
  try {
    assert.equal((await fetch(url)).status, 401);
    for (const role of ["EMPLOYEE", "ADMIN"] as const) {
      const res = await fetch(url, { headers: { "x-test-role": role } });
      assert.equal(res.status, 403, `${role} must be denied`);
    }
    const ok = await fetch(url, { headers: { "x-test-role": "SUPER_ADMIN" } });
    assert.equal(ok.status, 200);
    const bad = await fetch(`${url}&extra=1`, { headers: { "x-test-role": "SUPER_ADMIN" } });
    assert.equal(bad.status, 400);
    assert.equal(h.recorded.length, 1, "only the successful read is audited");
  } finally {
    server.close();
  }
});
