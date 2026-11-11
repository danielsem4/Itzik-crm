import "dotenv/config";
import { EnvValidationError } from "./config/env";
import { logger } from "./shared/utils/logger";

/**
 * Server entrypoint.
 *
 * Environment validation runs first, at import of `./config`. If a required
 * secret is missing or unsafe, `EnvValidationError` is thrown and the process
 * exits non-zero BEFORE binding a port — fail fast, fail closed
 *. Only variable names are reported, never values.
 */
function main(): void {
  let config;
  let createApp;
  try {
    // Deferred requires so a config failure is caught and reported cleanly
    // rather than surfacing as an unhandled module-load exception.
    config = require("./config").config as typeof import("./config").config;
    createApp = require("./app").createApp as typeof import("./app").createApp;
  } catch (err) {
    if (err instanceof EnvValidationError) {
      logger.error("startup_config_invalid", { issues: err.issues });
    } else {
      logger.error("startup_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
    process.exit(1);
    return;
  }

  const app = createApp();
  app.listen(config.port, () => {
    logger.info("server_started", {
      port: config.port,
      env: config.nodeEnv,
    });
  });
}

main();
