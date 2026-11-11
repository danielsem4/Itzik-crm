import { test } from "node:test";
import assert from "node:assert/strict";
import { generateOpaqueToken, sha256Hex, constantTimeEquals } from "./tokens";

test("generateOpaqueToken is url-safe, high-entropy, and unique", () => {
  const a = generateOpaqueToken(32);
  const b = generateOpaqueToken(32);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/); // base64url alphabet, no padding
  // 32 bytes -> 43 base64url chars
  assert.ok(a.length >= 43);
});

test("sha256Hex is deterministic and 64 hex chars", () => {
  const h = sha256Hex("hello");
  assert.equal(h, sha256Hex("hello"));
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(sha256Hex("hello"), sha256Hex("world"));
});

test("constantTimeEquals matches equal strings and rejects others", () => {
  assert.equal(constantTimeEquals("abc", "abc"), true);
  assert.equal(constantTimeEquals("abc", "abd"), false);
  assert.equal(constantTimeEquals("abc", "abcd"), false); // different length
  assert.equal(constantTimeEquals("", ""), true);
});
