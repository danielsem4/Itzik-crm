import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnv, EnvValidationError } from "./env";

/** Minimal valid production environment; individual tests override fields. */
function prodEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://app:strongpass@db.internal:5432/itzik_crm?sslmode=require",
    CLIENT_URL: "https://app.example.com",
    ...overrides,
  };
}

test("production startup FAILS when DATABASE_URL is missing", () => {
  assert.throws(
    () => loadEnv(prodEnv({ DATABASE_URL: undefined })),
    (err: unknown) =>
      err instanceof EnvValidationError && err.issues.some((i) => i.includes("DATABASE_URL"))
  );
});

test("production startup REJECTS a localhost CLIENT_URL", () => {
  assert.throws(
    () => loadEnv(prodEnv({ CLIENT_URL: "http://localhost:5173" })),
    (err: unknown) =>
      err instanceof EnvValidationError && err.issues.some((i) => i.includes("CLIENT_URL"))
  );
});

test("production startup REJECTS a non-postgres DATABASE_URL", () => {
  assert.throws(() => loadEnv(prodEnv({ DATABASE_URL: "mysql://x" })), EnvValidationError);
});

test("valid production config loads successfully", () => {
  const config = loadEnv(prodEnv());
  assert.equal(config.isProduction, true);
  assert.equal(config.clientUrl, "https://app.example.com");
  assert.equal(config.secureCookies, true);
});

test("development defaults load without any env set", () => {
  const config = loadEnv({ NODE_ENV: "development" });
  assert.equal(config.isProduction, false);
  assert.equal(config.port, 3001);
  assert.equal(config.bodyLimit, "100kb");
});
