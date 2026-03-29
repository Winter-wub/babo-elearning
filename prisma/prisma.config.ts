import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * The database URL is provided via the DATABASE_URL environment variable.
 * The PrismaClient adapter (PrismaPg) is configured at runtime in src/lib/db.ts.
 */
export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
