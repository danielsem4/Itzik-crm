import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthenticatedError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  PayloadTooLargeError,
} from "./index";

test("AppError subclasses carry the correct status code and error code", () => {
  const cases: Array<[AppError, number, string]> = [
    [new ValidationError(), 400, "VALIDATION"],
    [new UnauthenticatedError(), 401, "UNAUTHENTICATED"],
    [new ForbiddenError(), 403, "FORBIDDEN"],
    [new NotFoundError(), 404, "NOT_FOUND"],
    [new ConflictError(), 409, "CONFLICT"],
    [new PayloadTooLargeError(), 413, "PAYLOAD_TOO_LARGE"],
    [new TooManyRequestsError(), 429, "RATE_LIMITED"],
  ];
  for (const [err, status, code] of cases) {
    assert.equal(err.statusCode, status, `${err.name} status`);
    assert.equal(err.code, code, `${err.name} code`);
    assert.equal(err.isOperational, true);
    assert.ok(err instanceof AppError);
    assert.ok(err instanceof Error);
  }
});

test("AppError carries safe details when provided", () => {
  const err = new ValidationError("Invalid input", { field: "email" });
  assert.deepEqual(err.details, { field: "email" });
});

test("instanceof works across the hierarchy (prototype chain intact)", () => {
  const err = new NotFoundError();
  assert.ok(err instanceof NotFoundError);
  assert.ok(err instanceof AppError);
});
