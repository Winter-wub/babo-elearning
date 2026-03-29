import { execSync } from "child_process";

/**
 * Playwright global setup — runs once before the entire test suite.
 *
 * Ensures the database is in a known, seeded state so all tests can rely on
 * the seed data (admin, students, videos, permissions) being present.
 *
 * Using `upsert` semantics in the seed script means running it multiple times
 * is safe — it will not create duplicates.
 */
export default async function globalSetup() {
  console.log("\n[global-setup] Running database seed...");
  try {
    execSync("pnpm prisma db seed", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("[global-setup] Database seed complete.\n");
  } catch (error) {
    console.error("[global-setup] Database seed failed:", error);
    // Re-throw so Playwright aborts the run rather than silently running
    // against an unseeded (or missing) database.
    throw error;
  }
}
