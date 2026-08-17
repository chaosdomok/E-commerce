import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prefer Supabase's DIRECT_URL when available; fall back to DATABASE_URL.
  // This avoids build-time failures when DIRECT_URL isn't set locally.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
