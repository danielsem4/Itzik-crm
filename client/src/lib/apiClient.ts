import axios, { type AxiosInstance } from "axios";

/**
 * Single axios instance for the API.
 *
 * - `withCredentials: true` so the HttpOnly opaque-session cookie is sent on
 *   every request (the raw session token never touches JS — it lives only in the
 *   cookie).
 * - CSRF: the server issues a per-session synchronizer token in the body of
 *   `login` and `me`. We keep it in memory (never localStorage) and echo it
 *   in `X-CSRF-Token` on every state-changing request (synchronizer-token
 *   pattern, server shared/middlewares/csrf.ts).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

const SAFE_METHODS = new Set(["get", "head", "options"]);

apiClient.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!SAFE_METHODS.has(method) && csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }
  return config;
});

/**
 * Narrow helper for the API's `{ error: { code, message } }` envelope so callers
 * can surface a human-readable message without leaking internals.
 */
export function extractApiError(error: unknown): { code?: string; message: string } {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: { code?: string; message?: string } }
      | undefined;
    if (payload?.error?.message) {
      return { code: payload.error.code, message: payload.error.message };
    }
    return { message: error.message };
  }
  return { message: "Something went wrong. Please try again." };
}
