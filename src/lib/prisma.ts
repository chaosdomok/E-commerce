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

  // Debug logging (remove in production)
  if (process.env.NODE_ENV !== "production") {
    console.log("[PRISM] DIRECT_URL exists:", !!directUrl);
    console.log("[PRISM] DATABASE_URL exists:", !!databaseUrl);
    console.log("[PRISM] Using:", directUrl ? "DIRECT_URL" : "DATABASE_URL");
    console.log("[PRISM] Connection string length:", connectionString.length);
    console.log("[PRISM] Connection string preview:", connectionString.substring(0, 20) + "...");
  }

  // Validate connection string format
  if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
    throw new Error(`Invalid connection string format. Expected postgresql:// or postgres://, got: ${connectionString.substring(0, 20)}...`);
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
