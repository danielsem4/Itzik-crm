import type { HelmetOptions } from "helmet";
import type { AppConfig } from "./env";

/**
 * Explicit HTTP security-header policy.
 *
 * Helmet 8's bare `helmet()` already sets 13 headers (HSTS, X-Content-Type-Options:
 * nosniff, X-Frame-Options, Referrer-Policy, a default CSP, etc.). We therefore
 * do NOT add any separate header middleware — that would duplicate or conflict.
 * Instead we pass one explicit options object to the single `helmet()` call so the
 * policy is reviewable in one place and hardened beyond the defaults where it
 * matters for an API server.
 */
export function buildHelmetOptions(config: AppConfig): HelmetOptions {
  return {
    /**
     * Content-Security-Policy for THIS server. This is a JSON API — it serves no
     * HTML, scripts, or styles — so the safest policy is to forbid loading
     * anything and forbid being framed.
     *
     * NOTE (cannot be finalized here): the *frontend SPA's* CSP is a separate
     * concern owned by the client build + its hosting/CDN. It depends on the
     * deployment architecture (asset origins, whether inline styles are used,
     * i18n RTL bundles, etc.) which is not known yet. Do not copy this API policy
     * to the SPA.
     */
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'none'"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'none'"],
        "form-action": ["'none'"],
      },
    },

    /**
     * HSTS. Browsers only honor this over HTTPS, so it is inert (harmless) in
     * local HTTP dev and active in production behind TLS.
     * `preload: false` — enabling preload commits the apex domain to HTTPS-only
     * and requires submitting to the browser preload list. That is a
     * deploy/domain-ownership decision, deferred until the production domain is
     * finalized.
     */
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: false,
    },

    // Explicit, though these match helmet's secure defaults — pinned so a future
    // helmet default change cannot silently alter our policy.
    referrerPolicy: { policy: "no-referrer" },
    xContentTypeOptions: true, // X-Content-Type-Options: nosniff
    xFrameOptions: { action: "deny" },

    // Not applicable to a JSON API; keep helmet's default (off) explicit intent
    // by leaving other headers at their secure defaults.
    crossOriginResourcePolicy: { policy: "same-site" },
  };
}
