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

  // Debug logging (always log for now to diagnose the issue)
  console.log("[PRISM] DIRECT_URL exists:", !!directUrl);
  console.log("[PRISM] DATABASE_URL exists:", !!databaseUrl);
  console.log("[PRISM] Using:", directUrl ? "DIRECT_URL" : "DATABASE_URL");
  console.log("[PRISM] Connection string length:", connectionString.length);
  console.log("[PRISM] Connection string preview:", connectionString.substring(0, 20) + "...");
  console.log("[PRISM] Connection string first char code:", connectionString.charCodeAt(0));
  console.log("[PRISM] Connection string last char code:", connectionString.charCodeAt(connectionString.length - 1));
  console.log("[PRISM] Connection string ends with >:", connectionString.endsWith(">"));

  // Let Prisma handle connection string validation
  const trimmedConnectionString = connectionString.trim();
  console.log("[PRISM] Trimmed connection string length:", trimmedConnectionString.length);
  console.log("[PRISM] Trimmed connection string preview:", trimmedConnectionString.substring(0, 20) + "...");

  // Remove trailing > if present (appears to be from malformed env file)
  const cleanConnectionString = trimmedConnectionString.endsWith(">") ? trimmedConnectionString.slice(0, -1) : trimmedConnectionString;
  console.log("[PRISM] Clean connection string length:", cleanConnectionString.length);
  console.log("[PRISM] Clean connection string preview:", cleanConnectionString.substring(0, 20) + "...");

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: cleanConnectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
