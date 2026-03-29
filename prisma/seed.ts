import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log("Seeding database...");

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
    })
  );

  students.forEach((s) => console.log(`Student: ${s.email} (id: ${s.id})`));

  // -------------------------
  // Sample videos
  // -------------------------
  const videosData = [
    {
      title: "Introduction to Web Development",
      description:
        "A beginner-friendly overview of HTML, CSS, and JavaScript fundamentals.",
      s3Key: "videos/intro-web-dev/intro-web-dev.mp4",
      duration: 1800, // 30 minutes
      thumbnailUrl: null,
    },
    {
      title: "Advanced React Patterns",
      description:
        "Deep dive into compound components, render props, and custom hooks.",
      s3Key: "videos/advanced-react/advanced-react-patterns.mp4",
      duration: 3200, // ~53 minutes
      thumbnailUrl: null,
    },
  ];

  const videos = await Promise.all(
    videosData.map((v) =>
      prisma.video.upsert({
        where: { s3Key: v.s3Key },
        update: {},
        create: {
          title: v.title,
          description: v.description,
          s3Key: v.s3Key,
          duration: v.duration,
          thumbnailUrl: v.thumbnailUrl,
          isActive: true,
        },
      })
    )
  );

  videos.forEach((v) => console.log(`Video: "${v.title}" (id: ${v.id})`));

  // -------------------------
  // Video permissions
  // alice -> both videos
  // bob  -> first video only
  // carol -> no permissions
  // -------------------------
  const permissionsData = [
    { student: students[0], video: videos[0] }, // alice -> intro
    { student: students[0], video: videos[1] }, // alice -> advanced react
    { student: students[1], video: videos[0] }, // bob   -> intro
  ];

  for (const { student, video } of permissionsData) {
    const permission = await prisma.videoPermission.upsert({
      where: { userId_videoId: { userId: student.id, videoId: video.id } },
      update: {},
      create: {
        userId: student.id,
        videoId: video.id,
        grantedBy: admin.id,
      },
    });
    console.log(
      `Permission granted: ${student.name} -> "${video.title}" (id: ${permission.id})`
    );
  }

  console.log("\nDatabase seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
