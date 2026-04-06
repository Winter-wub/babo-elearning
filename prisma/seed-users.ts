/**
 * Production seed: creates only the admin and student users.
 * Does NOT seed videos, permissions, playlists, FAQ, or content.
 *
 * Usage: pnpm tsx prisma/seed-users.ts
 */

import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log("Seeding users only...");

  // -------------------------
  // Admin user
  // -------------------------
  const adminPassword = await hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@elearning.com" },
    update: {},
    create: {
      email: "admin@elearning.com",
      passwordHash: adminPassword,
      name: "Admin",
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`Admin user: ${admin.email} (id: ${admin.id})`);

  // -------------------------
  // Sample students
  // -------------------------
  const studentsData = [
    {
      email: "alice@student.com",
      name: "Alice Johnson",
      password: "Student123!",
    },
    { email: "bob@student.com", name: "Bob Smith", password: "Student123!" },
    {
      email: "carol@student.com",
      name: "Carol White",
      password: "Student123!",
    },
  ];

  const students = await Promise.all(
    studentsData.map(async (s) => {
      const passwordHash = await hashPassword(s.password);
      return prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: {
          email: s.email,
          passwordHash,
          name: s.name,
          role: Role.STUDENT,
          isActive: true,
        },
      });
    }),
  );

  students.forEach((s) => console.log(`Student: ${s.email} (id: ${s.id})`));

  console.log("\nUser seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
