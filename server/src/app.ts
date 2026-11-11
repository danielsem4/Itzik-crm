import express, { type Express, type Router } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config, buildHelmetOptions } from "./config";
import { errorHandler } from "./shared/middlewares/errorHandler";
import { prisma } from "./lib/prisma";
import { buildAuthRouter } from "./modules/auth";
import { buildAuditLogsRouter } from "./modules/audit-logs";

/**
 * Build the Express application (no `listen`). Kept separate from `index.ts` so
 * tests can construct the app, mount throwing routes, and exercise the full
 * middleware stack + error handler without opening the real server port.
 *
 * @param extraRouters routers mounted BEFORE the error handler. Intended for
 *   tests only — production calls `createApp()` with no extras.
 */
export function createApp(extraRouters: Router[] = []): Express {
  const app = express();

  // --- HTTP security headers (single helmet() call; see config/helmet.ts) ---
  // Helmet already sets 13 headers; we pass one explicit options object rather
  // than adding separate header middleware, to avoid duplicate/conflicting
  // headers.
  app.use(helmet(buildHelmetOptions(config)));

  // --- CORS: single trusted origin, credentialed ---
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );

  // --- Body parsers with explicit size limits ---
  // Conservative default (100kb) suits auth/metadata JSON. File uploads are
  // handled by a separate multer pipeline with its OWN, larger limits.
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // --- Cookies ---
  // Intentionally UNSIGNED. The auth cookie carries a high-entropy opaque session
  // token whose integrity comes from the server-side SHA-256 hash lookup, not a
  // signature — a signed Express cookie would add nothing. Signing is only
  // warranted for NON-session sensitive cookie values, of which we have none.
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- Auth vertical slice (login/session/password/provisioning) ---
  app.use(buildAuthRouter(prisma));

  // --- Audit-log reads (SUPER_ADMIN, every read audited) ---
  app.use(buildAuditLogsRouter(prisma));

  // Business feature routers mount above as each vertical slice is implemented
  // under src/modules. `extraRouters` is for tests only.
  for (const router of extraRouters) {
    app.use(router);
  }

  // Error handler is always LAST.
  app.use(errorHandler);

  return app;
}
