import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, assertPasswordPolicy } from "./password";
import { ValidationError } from "../errors";

test("assertPasswordPolicy rejects too-short and too-long passwords", () => {
  assert.throws(() => assertPasswordPolicy("short"), ValidationError);
  assert.throws(() => assertPasswordPolicy("x".repeat(200)), ValidationError);
  assert.doesNotThrow(() => assertPasswordPolicy("a-perfectly-fine-password"));
});

test("hashPassword produces a bcrypt hash that verifies and is not the plaintext", async () => {
  const plain = "correct horse battery staple";
  const hash = await hashPassword(plain);
  assert.ok(hash.startsWith("$2")); // bcrypt hash prefix
  assert.notEqual(hash, plain);
  assert.equal(await verifyPassword(plain, hash), true);
  assert.equal(await verifyPassword("wrong password entirely", hash), false);
});

test("hashPassword enforces the policy before hashing", async () => {
  await assert.rejects(() => hashPassword("short"), ValidationError);
});
