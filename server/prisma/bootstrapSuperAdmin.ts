/**
 * SUPER_ADMIN bootstrap.
 *
 * A standalone CLI — NEVER an HTTP endpoint. Idempotent: refuses (no-op) if an
 * active SUPER_ADMIN already exists. The email/password come from environment
 * variables supplied out-of-band (a secret channel); the password is NEVER
 * logged, emailed, or committed.
 *
 * Usage (example):
 *   BOOTSTRAP_SUPERADMIN_EMAIL=owner@org.example \
 *   BOOTSTRAP_SUPERADMIN_PASSWORD='<strong secret>' \
 *   npm run bootstrap:superadmin
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/shared/utils/password";
import { logger } from "../src/shared/utils/logger";

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || "Super Admin";

  if (!email || !password) {
    console.error(
      "Set BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD " +
        "(supply out-of-band; never commit or log these)."
    );
    process.exit(1);
    return;
  }

  // Idempotent + exactly-one-active invariant (also enforced by the DB partial
  // unique index `one_active_super_admin`).
  const activeSuperAdmins = await prisma.user.count({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  if (activeSuperAdmins > 0) {
    logger.info("superadmin_bootstrap_skipped", { reason: "active_super_admin_exists" });
    console.log("An active SUPER_ADMIN already exists — bootstrap is a no-op.");
    process.exit(0);
    return;
  }

  // hashPassword enforces the password policy (min length etc.).
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "SUPERADMIN_BOOTSTRAP",
      result: "SUCCESS",
      actorUserId: user.id,
      targetType: "user",
      targetId: user.id,
    },
  });

  logger.info("superadmin_bootstrap_ok", { userId: user.id });
  console.log(
    `Created SUPER_ADMIN ${user.email} (id ${user.id}).`
  );
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error("bootstrap failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
