/**
 * Security-critical environment validation .
 *
 * Design goals:
 * - **Fail closed / fail fast:** production refuses to start if a required secret
 *   is missing or unsafe. There are NO insecure production fallbacks.
 * - **No secret leakage:** validation error messages name the *variable*, never
 *   its value. Nothing here logs a secret.
 * - **Pure & testable:** `loadEnv(raw)` is a pure function of its input, so tests
 *   can exercise production behavior without touching `process.env`.
 */

export type NodeEnv = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;
  /** Body-parser size limit. */
  bodyLimit: string;
  databaseUrl: string;
  /** Single trusted browser origin — becomes the CORS allow-list. */
  clientUrl: string;
  /** Whether cookies should carry the `Secure` attribute (HTTPS only). */
  secureCookies: boolean;
  smtp?: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
  };
}

/** Non-production defaults so local dev / CI boot without ceremony. Never used in production. */
const DEV_DATABASE_URL =
  "postgresql://postgres:password@localhost:5432/itzik_crm?schema=public";
const DEV_CLIENT_URL = "http://localhost:5173";

/** Thrown when the environment fails validation. Carries only safe, variable-level messages. */
export class EnvValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n` +
        issues.map((i) => `  - ${i}`).join("\n")
    );
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

/**
 * Validate and normalize the environment. Pure: depends only on `raw`.
 * Throws {@link EnvValidationError} on any problem — the caller decides whether
 * to crash (production startup) or surface it (tests).
 */
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (raw.NODE_ENV ?? "development") as string;
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new EnvValidationError([
      `NODE_ENV must be one of development|test|production (received "${nodeEnv}")`,
    ]);
  }
  const isProduction = nodeEnv === "production";

  const issues: string[] = [];

  // --- PORT ---
  let port = 3001;
  if (raw.PORT !== undefined && raw.PORT !== "") {
    const parsed = Number(raw.PORT);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
      issues.push("PORT must be an integer between 1 and 65535");
    } else {
      port = parsed;
    }
  }

  // --- DATABASE_URL (required in production) ---
  let databaseUrl = raw.DATABASE_URL ?? "";
  if (!databaseUrl) {
    if (isProduction) {
      issues.push("DATABASE_URL is required in production");
    } else {
      databaseUrl = DEV_DATABASE_URL;
    }
  } else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    issues.push("DATABASE_URL must be a postgres:// connection string");
  }

  // --- CLIENT_URL (trusted origin; must be explicit & non-local in production) ---
  let clientUrl = raw.CLIENT_URL ?? "";
  if (!clientUrl) {
    if (isProduction) {
      issues.push("CLIENT_URL is required in production (CORS allow-list)");
    } else {
      clientUrl = DEV_CLIENT_URL;
    }
  } else {
    let parsedUrl: URL | undefined;
    try {
      parsedUrl = new URL(clientUrl);
    } catch {
      issues.push("CLIENT_URL must be a valid absolute URL");
    }
    if (parsedUrl && isProduction) {
      if (parsedUrl.protocol !== "https:") {
        issues.push("CLIENT_URL must use https:// in production");
      }
      const host = parsedUrl.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        issues.push("CLIENT_URL must not be localhost in production");
      }
      if (host === "*" || clientUrl.includes("*")) {
        issues.push("CLIENT_URL must be an explicit origin, not a wildcard");
      }
    }
  }

  // --- Optional SMTP (validated only if partially provided) ---
  let smtp: AppConfig["smtp"];
  if (raw.SMTP_HOST || raw.SMTP_PORT || raw.SMTP_USER || raw.SMTP_PASS) {
    const smtpPort = raw.SMTP_PORT ? Number(raw.SMTP_PORT) : 587;
    if (raw.SMTP_HOST && (!Number.isInteger(smtpPort) || smtpPort <= 0)) {
      issues.push("SMTP_PORT must be a positive integer");
    }
    if (raw.SMTP_HOST) {
      smtp = {
        host: raw.SMTP_HOST,
        port: smtpPort,
        user: raw.SMTP_USER || undefined,
        pass: raw.SMTP_PASS || undefined,
      };
    }
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return {
    nodeEnv: nodeEnv as NodeEnv,
    isProduction,
    port,
    bodyLimit: raw.BODY_LIMIT || "100kb",
    databaseUrl,
    clientUrl,
    // Secure cookies whenever we serve over TLS; always in production.
    secureCookies: isProduction,
    smtp,
  };
}
