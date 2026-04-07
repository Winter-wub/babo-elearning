import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as pg from "pg";
import * as bcrypt from "bcryptjs";

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
  console.log("Seeding database...");

  // -------------------------
  // Admin user
  // -------------------------
  const adminPassword = await hashPassword("Admin123!");

  // First ensure default tenant exists
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      id: "default",
      name: "Default Tenant",
      slug: "default",
    },
  });

  const tenantA = await prisma.tenant.upsert({
    where: { slug: "tenant-a" },
    update: {},
    create: {
      name: "Tenant A",
      slug: "tenant-a",
    },
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: "tenant-b" },
    update: {},
    create: {
      name: "Tenant B",
      slug: "tenant-b",
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@elearning.com" },
    update: {},
    create: {
      email: "superadmin@elearning.com",
      passwordHash: adminPassword,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`Super Admin user: ${superAdmin.email} (id: ${superAdmin.id})`);

  const ownerA = await prisma.user.upsert({
    where: { email: "owner-a@elearning.com" },
    update: {},
    create: {
      email: "owner-a@elearning.com",
      passwordHash: adminPassword,
      name: "Tenant A Owner",
      role: Role.STUDENT,
      isActive: true,
    },
  });
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenantA.id, userId: ownerA.id } },
    update: { role: "OWNER" },
    create: {
      tenantId: tenantA.id,
      userId: ownerA.id,
      role: "OWNER",
    },
  });
  console.log(`Tenant A Owner: ${ownerA.email} (id: ${ownerA.id})`);

  const ownerB = await prisma.user.upsert({
    where: { email: "owner-b@elearning.com" },
    update: {},
    create: {
      email: "owner-b@elearning.com",
      passwordHash: adminPassword,
      name: "Tenant B Owner",
      role: Role.STUDENT,
      isActive: true,
    },
  });
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenantB.id, userId: ownerB.id } },
    update: { role: "OWNER" },
    create: {
      tenantId: tenantB.id,
      userId: ownerB.id,
      role: "OWNER",
    },
  });
  console.log(`Tenant B Owner: ${ownerB.email} (id: ${ownerB.id})`);

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
  // Admin needs a TenantMember on the default tenant for per-tenant deployment model
  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: defaultTenant.id, userId: admin.id } },
    update: { role: "ADMIN" },
    create: {
      tenantId: defaultTenant.id,
      userId: admin.id,
      role: "ADMIN",
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
      tenantId: defaultTenant.id,
    },
    { email: "bob@student.com", name: "Bob Smith", password: "Student123!", tenantId: defaultTenant.id },
    {
      email: "carol@student.com",
      name: "Carol White",
      password: "Student123!",
      tenantId: defaultTenant.id,
    },
    {
      email: "student-a1@tenant-a.com",
      name: "Student A1",
      password: "Student123!",
      tenantId: tenantA.id,
    },
    {
      email: "student-a2@tenant-a.com",
      name: "Student A2",
      password: "Student123!",
      tenantId: tenantA.id,
    },
    {
      email: "student-b1@tenant-b.com",
      name: "Student B1",
      password: "Student123!",
      tenantId: tenantB.id,
    },
    {
      email: "student-b2@tenant-b.com",
      name: "Student B2",
      password: "Student123!",
      tenantId: tenantB.id,
    },
  ];

  const students = await Promise.all(
    studentsData.map(async (s) => {
      const passwordHash = await hashPassword(s.password);
      const user = await prisma.user.upsert({
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

      await prisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: s.tenantId, userId: user.id } },
        update: {},
        create: {
          tenantId: s.tenantId,
          userId: user.id,
          role: "STUDENT",
        },
      });

      return user;
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
      tenantId: defaultTenant.id,
    },
    {
      title: "Advanced React Patterns",
      description:
        "Deep dive into compound components, render props, and custom hooks.",
      s3Key: "videos/advanced-react/advanced-react-patterns.mp4",
      duration: 3200, // ~53 minutes
      thumbnailUrl: null,
      playCount: 412,
      tenantId: defaultTenant.id,
    },
    {
      title: "TypeScript Fundamentals",
      description: "Learn TypeScript from scratch with practical examples.",
      s3Key: "videos/typescript-fundamentals/typescript-fundamentals.mp4",
      duration: 2400,
      thumbnailUrl: null,
      playCount: 189,
      tenantId: defaultTenant.id,
    },
    {
      title: "CSS Grid & Flexbox Mastery",
      description: "Master modern CSS layout techniques.",
      s3Key: "videos/css-layout/css-grid-flexbox.mp4",
      duration: 1500,
      thumbnailUrl: null,
      playCount: 67,
      tenantId: defaultTenant.id,
    },
    {
      title: "Node.js REST API Design",
      description: "Build production-ready REST APIs with Node.js and Express.",
      s3Key: "videos/node-rest-api/node-rest-api.mp4",
      duration: 2700,
      thumbnailUrl: null,
      playCount: 321,
      tenantId: defaultTenant.id,
    },
    {
      title: "Database Design Principles",
      description: "Relational database design, normalization, and indexing.",
      s3Key: "videos/db-design/database-design.mp4",
      duration: 2100,
      thumbnailUrl: null,
      playCount: 98,
      tenantId: defaultTenant.id,
    },
    {
      title: "Tenant A Exclusive Course",
      description: "Course available only to Tenant A.",
      s3Key: "videos/tenant-a/exclusive.mp4",
      duration: 1200,
      thumbnailUrl: null,
      playCount: 15,
      tenantId: tenantA.id,
    },
    {
      title: "Tenant B Advanced Course",
      description: "Advanced topics for Tenant B.",
      s3Key: "videos/tenant-b/advanced.mp4",
      duration: 1600,
      thumbnailUrl: null,
      playCount: 42,
      tenantId: tenantB.id,
    },
  ];

  const videos = await Promise.all(
    videosData.map((v) =>
      prisma.video.upsert({
        where: { tenantId_s3Key: { tenantId: v.tenantId, s3Key: v.s3Key } },
        update: { playCount: v.playCount },
        create: {
          tenantId: v.tenantId,
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
  // Video permissions (time-based examples)
  // -------------------------
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;

  const permissionsData: {
    student: (typeof students)[0];
    video: (typeof videos)[0];
    timeFields: { validFrom?: Date | null; validUntil?: Date | null; durationDays?: number | null };
    label: string;
  }[] = [
    // Permanent: alice -> intro (existing behavior)
    {
      student: students[0], video: videos[0],
      timeFields: {},
      label: "permanent",
    },
    // Active 30-day duration: alice -> advanced react
    {
      student: students[0], video: videos[1],
      timeFields: {
        validUntil: new Date(now.getTime() + 30 * DAY),
        durationDays: 30,
      },
      label: "active 30-day",
    },
    // Active absolute range: bob -> intro
    {
      student: students[1], video: videos[0],
      timeFields: {
        validFrom: new Date(now.getTime() - 3 * DAY),
        validUntil: new Date(now.getTime() + 7 * DAY),
      },
      label: "active range",
    },
    // Expired: bob -> typescript (for testing expired state)
    {
      student: students[1], video: videos[2],
      timeFields: {
        validUntil: new Date(now.getTime() - 1 * DAY),
        durationDays: 1,
      },
      label: "expired",
    },
    // Scheduled/not-yet-active: carol -> CSS grid (starts tomorrow)
    {
      student: students[2], video: videos[3],
      timeFields: {
        validFrom: new Date(now.getTime() + 1 * DAY),
        validUntil: new Date(now.getTime() + 31 * DAY),
      },
      label: "scheduled (starts tomorrow)",
    },
    // Expiring soon: alice -> typescript (expires in 3 days — for amber badge)
    {
      student: students[0], video: videos[2],
      timeFields: {
        validUntil: new Date(now.getTime() + 3 * DAY),
        durationDays: 10,
      },
      label: "expiring soon (3 days)",
    },
  ];

  for (const { student, video, timeFields, label } of permissionsData) {
    const permission = await prisma.videoPermission.upsert({
      where: { tenantId_userId_videoId: { tenantId: video.tenantId, userId: student.id, videoId: video.id } },
      update: { ...timeFields },
      create: {
        tenantId: video.tenantId,
        userId: student.id,
        videoId: video.id,
        grantedBy: admin.id,
        ...timeFields,
      },
    });
    console.log(
      `Permission [${label}]: ${student.name} -> "${video.title}" (id: ${permission.id})`
    );
  }

  const tenantAStudent = students.find((s) => s.email === "student-a1@tenant-a.com");
  const tenantAVideo = videos.find((v) => v.tenantId === tenantA.id);
  if (tenantAStudent && tenantAVideo) {
    await prisma.videoPermission.upsert({
      where: { tenantId_userId_videoId: { tenantId: tenantA.id, userId: tenantAStudent.id, videoId: tenantAVideo.id } },
      update: {},
      create: {
        tenantId: tenantA.id,
        userId: tenantAStudent.id,
        videoId: tenantAVideo.id,
        grantedBy: ownerA.id,
      },
    });
  }

  const tenantBStudent = students.find((s) => s.email === "student-b1@tenant-b.com");
  const tenantBVideo = videos.find((v) => v.tenantId === tenantB.id);
  if (tenantBStudent && tenantBVideo) {
    await prisma.videoPermission.upsert({
      where: { tenantId_userId_videoId: { tenantId: tenantB.id, userId: tenantBStudent.id, videoId: tenantBVideo.id } },
      update: {},
      create: {
        tenantId: tenantB.id,
        userId: tenantBStudent.id,
        videoId: tenantBVideo.id,
        grantedBy: ownerB.id,
      },
    });
  }

  // -------------------------
  // Featured playlists (4)
  // -------------------------
  const featuredPlaylistsData = [
    { title: "Web Development Essentials", slug: "web-dev-essentials", sortOrder: 0, tenantId: defaultTenant.id },
    { title: "React Masterclass", slug: "react-masterclass", sortOrder: 1, tenantId: defaultTenant.id },
    { title: "Backend Engineering", slug: "backend-engineering", sortOrder: 2, tenantId: defaultTenant.id },
    { title: "Full-Stack Project", slug: "full-stack-project", sortOrder: 3, tenantId: defaultTenant.id },
    { title: "Tenant A Featured", slug: "tenant-a-featured", sortOrder: 0, tenantId: tenantA.id },
    { title: "Tenant B Featured", slug: "tenant-b-featured", sortOrder: 0, tenantId: tenantB.id },
  ];

  const featuredPlaylists = await Promise.all(
    featuredPlaylistsData.map((p) =>
      prisma.playlist.upsert({
        where: { tenantId_slug: { tenantId: p.tenantId, slug: p.slug } },
        update: {},
        create: {
          tenantId: p.tenantId,
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
    { title: "HTML & CSS Basics", slug: "html-css-basics", sortOrder: 10, tenantId: defaultTenant.id },
    { title: "JavaScript Deep Dive", slug: "javascript-deep-dive", sortOrder: 11, tenantId: defaultTenant.id },
    { title: "TypeScript in Practice", slug: "typescript-in-practice", sortOrder: 12, tenantId: defaultTenant.id },
    { title: "Database Fundamentals", slug: "database-fundamentals", sortOrder: 13, tenantId: defaultTenant.id },
    { title: "DevOps & Deployment", slug: "devops-deployment", sortOrder: 14, tenantId: defaultTenant.id },
    { title: "Testing Strategies", slug: "testing-strategies", sortOrder: 15, tenantId: defaultTenant.id },
    { title: "API Design Patterns", slug: "api-design-patterns", sortOrder: 16, tenantId: defaultTenant.id },
    { title: "Security Best Practices", slug: "security-best-practices", sortOrder: 17, tenantId: defaultTenant.id },
    { title: "Tenant A Category", slug: "tenant-a-category", sortOrder: 10, tenantId: tenantA.id },
    { title: "Tenant B Category", slug: "tenant-b-category", sortOrder: 10, tenantId: tenantB.id },
  ];

  const categoryPlaylists = await Promise.all(
    categoryPlaylistsData.map((p) =>
      prisma.playlist.upsert({
        where: { tenantId_slug: { tenantId: p.tenantId, slug: p.slug } },
        update: {},
        create: {
          tenantId: p.tenantId,
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
    const tenantVideos = videos.filter((v) => v.tenantId === playlist.tenantId);
    // Pick at least 3 videos; cycle through if needed.
    const videoSubset = tenantVideos.slice(0, Math.max(3, tenantVideos.length));
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

  // -------------------------
  // Site content (CMS)
  // -------------------------
  const siteContentData = [
    // Hero carousel slides (home page)
    { key: "hero.slide1.headline", value: "เรียนรู้ตามจังหวะของคุณ" },
    { key: "hero.slide1.sub", value: "คอร์สวิดีโอคัดสรรจากผู้เชี่ยวชาญในอุตสาหกรรม" },
    { key: "hero.slide1.cta", value: "ดูคอร์สเรียน" },
    { key: "hero.slide1.ctaHref", value: "#" },
    { key: "hero.slide2.headline", value: "สร้างทักษะการเงินที่แท้จริง" },
    { key: "hero.slide2.sub", value: "ตั้งแต่การลงทุนเบื้องต้นจนถึงการวางแผนภาษีขั้นสูง" },
    { key: "hero.slide2.cta", value: "เริ่มต้นเลย" },
    { key: "hero.slide2.ctaHref", value: "/register" },
    { key: "hero.slide3.headline", value: "เรียนรู้กับผู้เชี่ยวชาญ" },
    { key: "hero.slide3.sub", value: "เพลย์ลิสต์ที่จัดโครงสร้างเพื่อเป้าหมายของคุณ" },
    { key: "hero.slide3.cta", value: "ดูเพลย์ลิสต์" },
    { key: "hero.slide3.ctaHref", value: "#" },
    // About page
    { key: "about.hero.title", value: "E-Learning Platform" },
    { key: "about.hero.subtitle", value: "A comprehensive online learning platform packed with curated video courses on web development, programming, and software engineering — helping you build lasting skills at your own pace." },
    { key: "about.highlight.1.title", value: "Comprehensive Knowledge Coverage" },
    { key: "about.highlight.1.desc", value: "Courses cover everything from frontend basics to advanced backend architecture, ensuring a well-rounded skill set." },
    { key: "about.highlight.2.title", value: "Divided into Micro-Lessons" },
    { key: "about.highlight.2.desc", value: "Each course is broken down into bite-sized video lessons that are easy to follow and fit into your schedule." },
    { key: "about.highlight.3.title", value: "Includes Assessments" },
    { key: "about.highlight.3.desc", value: "Test your understanding with quizzes and practical exercises at the end of each module." },
    { key: "about.highlight.4.title", value: "Learning Progress Tracking" },
    { key: "about.highlight.4.desc", value: "Track your learning journey with detailed progress indicators and completion certificates." },
    { key: "about.highlight.5.title", value: "Multi-Device Support" },
    { key: "about.highlight.5.desc", value: "Access your courses seamlessly on PC, laptop, tablet, or mobile — learn anywhere, anytime." },
    { key: "about.info.sysreq.title", value: "System Requirements" },
    { key: "about.info.sysreq.content", value: "A modern web browser (Chrome, Firefox, Safari, Edge) with a stable internet connection. Minimum 2 Mbps recommended for smooth video playback." },
    { key: "about.info.cert.title", value: "Certification Process" },
    { key: "about.info.cert.content", value: "Complete all lessons in a course, pass the final assessment with 80% or higher, and receive a digital certificate of completion." },
    // Contact page
    { key: "contact.email", value: "support@elearning.com" },
    { key: "contact.phone", value: "+66 2-000-0000" },
    { key: "contact.address", value: "123 Learning Street, Bangkok, Thailand 10110" },
    // Privacy Policy
    { key: "privacy.title", value: "Privacy Policy" },
    { key: "privacy.content", value: "Last updated: January 1, 2026\n\n1. Information We Collect\n\nWe collect information you provide directly to us when you create an account, including your name, email address, and password. We also collect usage data such as video watch history and course progress.\n\n2. How We Use Your Information\n\nWe use the information we collect to:\n- Provide, maintain, and improve our services\n- Process your account registration and manage your account\n- Track your learning progress and generate completion certificates\n- Send you technical notices and support messages\n\n3. Data Security\n\nWe implement appropriate technical and organizational measures to protect the security of your personal information. All data is transmitted over encrypted connections (TLS/SSL), and passwords are stored using industry-standard hashing algorithms.\n\n4. Contact Us\n\nIf you have any questions about this Privacy Policy, please contact us at support@elearning.com." },
    // Terms of Use
    { key: "terms.title", value: "Terms of Use" },
    // App name (configurable)
    { key: "app.name", value: "อีเลิร์นนิง" },
    // Footer about section
    { key: "footer.about.heading", value: "เกี่ยวกับ" },
    { key: "footer.about.description", value: "แพลตฟอร์มอีเลิร์นนิงมอบคอร์สวิดีโอจากผู้เชี่ยวชาญด้านการเงิน การลงทุน และการวางแผนภาษี ช่วยให้คุณสร้างความรู้ที่ยั่งยืนตามจังหวะของคุณ" },
    { key: "footer.about.address", value: "123 Learning Street,\nBangkok, Thailand 10110" },
    { key: "footer.copyright", value: "แพลตฟอร์มอีเลิร์นนิง สงวนลิขสิทธิ์" },
    { key: "terms.content", value: "Last updated: January 1, 2026\n\n1. Acceptance of Terms\n\nBy accessing or using the E-Learning Platform, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.\n\n2. Account Registration\n\nTo access video courses, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials.\n\n3. Use of Content\n\nAll video courses and materials are provided for personal, non-commercial educational use only. You may not:\n- Download, copy, or redistribute any video content\n- Share your account credentials with others\n- Use automated tools to access or scrape content\n\n4. Intellectual Property\n\nAll content on this platform is the property of E-Learning Platform or its content creators and is protected by copyright and intellectual property laws.\n\n5. Contact\n\nFor questions about these Terms of Use, contact us at support@elearning.com." },
  ];

  for (const item of siteContentData) {
    await prisma.siteContent.upsert({
      where: { tenantId_key: { tenantId: defaultTenant.id, key: item.key } },
      update: { value: item.value },
      create: { tenantId: defaultTenant.id, ...item },
    });

    await prisma.siteContent.upsert({
      where: { tenantId_key: { tenantId: tenantA.id, key: item.key } },
      update: { value: item.value },
      create: { tenantId: tenantA.id, ...item },
    });

    await prisma.siteContent.upsert({
      where: { tenantId_key: { tenantId: tenantB.id, key: item.key } },
      update: { value: item.value },
      create: { tenantId: tenantB.id, ...item },
    });
  }
  console.log(`Seeded ${siteContentData.length} site content entries.`);

  // -------------------------
  // FAQ entries
  // -------------------------
  const faqData = [
    {
      question: "How do I access the video courses?",
      answer: "After registering and logging in, navigate to your Dashboard. You will see all videos that have been assigned to you. Click on any video to start watching.",
      sortOrder: 0,
    },
    {
      question: "What devices can I use to watch courses?",
      answer: "Our platform works on any modern web browser — Chrome, Firefox, Safari, or Edge. You can use a desktop computer, laptop, tablet, or smartphone.",
      sortOrder: 1,
    },
    {
      question: "How are video permissions granted?",
      answer: "Video access is managed by administrators. Once an admin grants you permission to a specific video, it will appear in your Dashboard automatically.",
      sortOrder: 2,
    },
    {
      question: "Can I download videos for offline viewing?",
      answer: "Currently, videos are available for streaming only. They cannot be downloaded. This ensures content security and prevents unauthorized distribution.",
      sortOrder: 3,
    },
    {
      question: "How do I get a certificate of completion?",
      answer: "Complete all lessons in a course and pass the final assessment with a score of 80% or higher. Your certificate will be generated automatically and available for download.",
      sortOrder: 4,
    },
    {
      question: "What if I forget my password?",
      answer: "On the login page, use the 'Forgot Password' link to receive a password reset email. Follow the instructions in the email to set a new password.",
      sortOrder: 5,
    },
    {
      question: "Who do I contact for technical support?",
      answer: "Visit our Contact page or email support@elearning.com. Our support team responds within 24 business hours.",
      sortOrder: 6,
    },
    {
      question: "Is there a mobile app available?",
      answer: "We do not have a dedicated mobile app at this time, but the platform is fully responsive and works great in mobile browsers.",
      sortOrder: 7,
    },
  ];

  for (const item of faqData) {
    const existingDefault = await prisma.faq.findFirst({
      where: { tenantId: defaultTenant.id, question: item.question },
    });
    if (!existingDefault) {
      await prisma.faq.create({
        data: { tenantId: defaultTenant.id, ...item, isActive: true },
      });
    }

    const existingA = await prisma.faq.findFirst({
      where: { tenantId: tenantA.id, question: item.question },
    });
    if (!existingA) {
      await prisma.faq.create({
        data: { tenantId: tenantA.id, ...item, isActive: true },
      });
    }

    const existingB = await prisma.faq.findFirst({
      where: { tenantId: tenantB.id, question: item.question },
    });
    if (!existingB) {
      await prisma.faq.create({
        data: { tenantId: tenantB.id, ...item, isActive: true },
      });
    }
  }
  console.log(`Seeded ${faqData.length} FAQ entries.`);

  console.log("\nDatabase seeding complete.");
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
