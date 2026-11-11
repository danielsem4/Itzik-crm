/**
 * Minimal, dependency-free structured logger.
 *
 * Emits one JSON object per line so logs are machine-parseable by an aggregator.
 * This is the OPERATIONAL log — detailed diagnostic information stays here,
 * server-side, and is never sent to clients.
 *
 * Callers pass only safe fields. Do NOT log secrets, tokens, OTPs, passwords, or
 * raw request bodies. A separate structured *audit* log for security events is a
 * later concern; this is general operational logging.
 */

type LogLevel = "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

/**
 * Serialize an unknown thrown value for server-side logging — including the
 * stack. This output is for logs ONLY and must never be returned to a client.
 */
export function serializeError(err: unknown): LogFields {
  if (err instanceof Error) {
    return {
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    };
  }
  return { error: String(err) };
}

export const logger = {
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
