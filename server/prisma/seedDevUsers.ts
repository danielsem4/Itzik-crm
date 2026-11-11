/**
 * DEV-ONLY login seed. Guarantees one known, ACTIVE account per role so the UI can
 * be exercised locally, and prints the credentials. NOT for production.
 *
 * - Loads server/.env (the Prisma singleton does not auto-load it).
 * - EMPLOYEE + ADMIN are upserted by a fixed email.
 * - SUPER_ADMIN: the DB enforces exactly one ACTIVE super admin
 *   (partial unique index `one_active_super_admin`), so we RESET the existing
 *   active super admin's password rather than create a second one. If none
 *   exists, a new one is created.
 *
 * Run: `npm run db:seed:dev` (from server/).
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/shared/utils/password";

const DEV_PASSWORD = "Str0ng-Passphrase-2026";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seedDevUsers is for development only — refusing to run with NODE_ENV=production");
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const now = new Date();
  const results: Array<{ role: string; email: string }> = [];

  // EMPLOYEE
  const employee = await prisma.user.upsert({
    where: { email: "employee@itzik.test" },
    create: {
      email: "employee@itzik.test",
      name: "Dev Employee",
      role: "EMPLOYEE",
      status: "ACTIVE",
      passwordHash,
      passwordChangedAt: now,
    },
    update: { status: "ACTIVE", passwordHash, passwordChangedAt: now },
  });
  results.push({ role: "EMPLOYEE", email: employee.email });

  // ADMIN
  const admin = await prisma.user.upsert({
    where: { email: "admin@itzik.test" },
    create: {
      email: "admin@itzik.test",
      name: "Dev Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash,
      passwordChangedAt: now,
    },
    update: { status: "ACTIVE", passwordHash, passwordChangedAt: now },
  });
  results.push({ role: "ADMIN", email: admin.email });

  // SUPER_ADMIN — reset the existing active one (single-active-super-admin index).
  const existingSuper = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  let superEmail: string;
  if (existingSuper) {
    const updated = await prisma.user.update({
      where: { id: existingSuper.id },
      data: { passwordHash, passwordChangedAt: now },
    });
    superEmail = updated.email;
  } else {
    const created = await prisma.user.create({
      data: {
        email: "super@itzik.test",
        name: "Dev Super Admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        passwordHash,
        passwordChangedAt: now,
      },
    });
    superEmail = created.email;
  }
  results.push({ role: "SUPER_ADMIN", email: superEmail });

  // eslint-disable-next-line no-console
  console.log("\nDev login credentials (all share the same password):\n");
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`  ${r.role.padEnd(12)} ${r.email}`);
  }
  // eslint-disable-next-line no-console
  console.log(`\n  password: ${DEV_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
