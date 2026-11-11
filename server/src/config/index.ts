import { loadEnv } from "./env";

/**
 * Application configuration singleton.
 *
 * Importing this module validates the environment.
 * If validation fails, `loadEnv` throws `EnvValidationError` here — at import
 * time — so the process fails fast before any request is served. The error
 * message names offending variables only, never their values.
 */
export const config = loadEnv(process.env);

export { loadEnv, EnvValidationError } from "./env";
export type { AppConfig, NodeEnv } from "./env";
export { buildHelmetOptions } from "./helmet";
export { RATE_LIMIT_POLICIES } from "./rateLimitPolicies";
export type { RateLimitPolicy, RateLimitPolicyName } from "./rateLimitPolicies";
export { securityPolicy } from "./securityPolicy";
export type { SecurityPolicy } from "./securityPolicy";
