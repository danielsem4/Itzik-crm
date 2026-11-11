import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config";

// Single shared Prisma client for the process. In dev, reuse across nodemon
// reloads to avoid exhausting the connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 driver-adapter mode: the client requires an adapter (mirrors
// prisma.config.ts). Construction is lazy — no connection is opened until the
// first query — so importing this module is safe in tests that never hit the DB.
function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (!config.isProduction) {
  globalForPrisma.prisma = prisma;
}
