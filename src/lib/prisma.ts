import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const directUrl = process.env.DIRECT_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const connectionString = directUrl || databaseUrl;

  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is required to initialize Prisma Client.");
  }

  // Remove trailing > if present (appears to be from malformed env file)
  const trimmedConnectionString = connectionString.trim();
  const cleanConnectionString = trimmedConnectionString.endsWith(">") ? trimmedConnectionString.slice(0, -1) : trimmedConnectionString;

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: cleanConnectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
