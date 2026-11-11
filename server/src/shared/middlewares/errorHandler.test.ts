import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { createApp } from "../../app";
import { NotFoundError } from "../errors";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Integration tests for the real assembled app: they build `createApp` with a
 * test-only router of throwing routes, listen on an ephemeral port, and assert
 * the HTTP responses. This exercises the actual body-size limit, helmet stack,
 * and error handler — not mocks.
 */

function buildTestApp() {
  const router = express.Router();
  // Route that throws an unexpected error containing sensitive-looking internals.
  router.get("/boom", () => {
    throw new Error("secret boom at /etc/passwd — DATABASE_URL=postgres://leak");
  });
  // Route that throws an expected AppError.
  router.get("/missing", () => {
    throw new NotFoundError();
  });
  // Echo route to reach after the body parser (for the oversized-body test).
  router.post("/echo", (req, res) => {
    res.json({ ok: true, received: req.body });
  });
  return createApp([router]);
}

async function withServer(
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = buildTestApp();
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("unexpected errors return a generic 500 with NO internal leakage", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/boom`);
    assert.equal(res.status, 500);
    const body = (await res.json()) as ErrorBody;
    assert.deepEqual(body, {
      error: { code: "INTERNAL", message: "Internal server error" },
    });
    const raw = JSON.stringify(body);
    // None of the internal details may appear in the client response.
    assert.ok(!raw.includes("/etc/passwd"));
    assert.ok(!raw.includes("DATABASE_URL"));
    assert.ok(!raw.includes("boom"));
    assert.ok(!raw.toLowerCase().includes("stack"));
  });
});

test("expected AppError (NotFound) maps to the correct status and code", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/missing`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as ErrorBody;
    assert.equal(body.error.code, "NOT_FOUND");
    assert.equal(typeof body.error.message, "string");
  });
});

test("oversized request bodies are rejected with 413", async () => {
  await withServer(async (baseUrl) => {
    // Body far larger than the configured 100kb limit.
    const huge = JSON.stringify({ data: "x".repeat(200 * 1024) });
    const res = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: huge,
    });
    assert.equal(res.status, 413);
    const body = (await res.json()) as ErrorBody;
    assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
  });
});

test("malformed JSON bodies are rejected with 400", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ this is not valid json",
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as ErrorBody;
    assert.equal(body.error.code, "BAD_REQUEST");
  });
});

test("health endpoint responds ok and sets hardened security headers", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    // Helmet baseline headers present (configured, not duplicated).
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
    assert.ok(res.headers.get("content-security-policy")?.includes("default-src 'none'"));
  });
});
