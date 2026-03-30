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
      playCount: 245,
    },
    {
      title: "Advanced React Patterns",
      description:
        "Deep dive into compound components, render props, and custom hooks.",
      s3Key: "videos/advanced-react/advanced-react-patterns.mp4",
      duration: 3200, // ~53 minutes
      thumbnailUrl: null,
      playCount: 412,
    },
    {
      title: "TypeScript Fundamentals",
      description: "Learn TypeScript from scratch with practical examples.",
      s3Key: "videos/typescript-fundamentals/typescript-fundamentals.mp4",
      duration: 2400,
      thumbnailUrl: null,
      playCount: 189,
    },
    {
      title: "CSS Grid & Flexbox Mastery",
      description: "Master modern CSS layout techniques.",
      s3Key: "videos/css-layout/css-grid-flexbox.mp4",
      duration: 1500,
      thumbnailUrl: null,
      playCount: 67,
    },
    {
      title: "Node.js REST API Design",
      description: "Build production-ready REST APIs with Node.js and Express.",
      s3Key: "videos/node-rest-api/node-rest-api.mp4",
      duration: 2700,
      thumbnailUrl: null,
      playCount: 321,
    },
    {
      title: "Database Design Principles",
      description: "Relational database design, normalization, and indexing.",
      s3Key: "videos/db-design/database-design.mp4",
      duration: 2100,
      thumbnailUrl: null,
      playCount: 98,
    },
  ];

  const videos = await Promise.all(
    videosData.map((v) =>
      prisma.video.upsert({
        where: { s3Key: v.s3Key },
        update: { playCount: v.playCount },
        create: {
          title: v.title,
          description: v.description,
          s3Key: v.s3Key,
          duration: v.duration,
          thumbnailUrl: v.thumbnailUrl,
          isActive: true,
          playCount: v.playCount,
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

  // -------------------------
  // Featured playlists (4)
  // -------------------------
  const featuredPlaylistsData = [
    { title: "Web Development Essentials", slug: "web-dev-essentials", sortOrder: 0 },
    { title: "React Masterclass", slug: "react-masterclass", sortOrder: 1 },
    { title: "Backend Engineering", slug: "backend-engineering", sortOrder: 2 },
    { title: "Full-Stack Project", slug: "full-stack-project", sortOrder: 3 },
  ];

  const featuredPlaylists = await Promise.all(
    featuredPlaylistsData.map((p) =>
      prisma.playlist.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          title: p.title,
          slug: p.slug,
          description: `Curated playlist: ${p.title}`,
          thumbnailUrl: null,
          isActive: true,
          isFeatured: true,
          sortOrder: p.sortOrder,
        },
      })
    )
  );

  featuredPlaylists.forEach((p) =>
    console.log(`Featured playlist: "${p.title}" (id: ${p.id})`)
  );

  // -------------------------
  // Category playlists (8, not featured)
  // -------------------------
  const categoryPlaylistsData = [
    { title: "HTML & CSS Basics", slug: "html-css-basics", sortOrder: 10 },
    { title: "JavaScript Deep Dive", slug: "javascript-deep-dive", sortOrder: 11 },
    { title: "TypeScript in Practice", slug: "typescript-in-practice", sortOrder: 12 },
    { title: "Database Fundamentals", slug: "database-fundamentals", sortOrder: 13 },
    { title: "DevOps & Deployment", slug: "devops-deployment", sortOrder: 14 },
    { title: "Testing Strategies", slug: "testing-strategies", sortOrder: 15 },
    { title: "API Design Patterns", slug: "api-design-patterns", sortOrder: 16 },
    { title: "Security Best Practices", slug: "security-best-practices", sortOrder: 17 },
  ];

  const categoryPlaylists = await Promise.all(
    categoryPlaylistsData.map((p) =>
      prisma.playlist.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          title: p.title,
          slug: p.slug,
          description: `Category playlist: ${p.title}`,
          thumbnailUrl: null,
          isActive: true,
          isFeatured: false,
          sortOrder: p.sortOrder,
        },
      })
    )
  );

  categoryPlaylists.forEach((p) =>
    console.log(`Category playlist: "${p.title}" (id: ${p.id})`)
  );

  // -------------------------
  // Link videos to featured playlists (at least 3 videos each)
  // -------------------------
  // Each featured playlist gets 3+ videos from the seeded video pool.
  for (const playlist of featuredPlaylists) {
    // Pick at least 3 videos; cycle through if needed.
    const videoSubset = videos.slice(0, Math.max(3, videos.length));
    for (let i = 0; i < videoSubset.length; i++) {
      await prisma.playlistVideo.upsert({
        where: {
          playlistId_videoId: {
            playlistId: playlist.id,
            videoId: videoSubset[i].id,
          },
        },
        update: {},
        create: {
          playlistId: playlist.id,
          videoId: videoSubset[i].id,
          position: i,
        },
      });
    }
    console.log(
      `Linked ${videoSubset.length} videos to playlist "${playlist.title}"`
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
