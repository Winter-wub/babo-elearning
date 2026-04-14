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
      where: { userId_videoId: { userId: student.id, videoId: video.id } },
      update: { ...timeFields },
      create: {
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

  // -------------------------
  // Site content (CMS)
  // -------------------------
  const siteContentData = [
    // Hero section (home page — static hero)
    { key: "hero.badge", value: "นักเรียนกว่า 500 คนเรียนกับ Gift แล้ว" },
    { key: "hero.headline1", value: "อยากเก่งภาษาอังกฤษแต่ไม่รู้จะเริ่มจากไหน?" },
    { key: "hero.headline2", value: "เราจะพาคุณไปถึงเป้าหมาย" },
    { key: "hero.body", value: "ทดสอบระดับภาษาอังกฤษของคุณฟรี รู้ว่าจุดอ่อนอยู่ที่ไหน แล้วเรียนตามแผนที่ตรงกับคุณ" },
    { key: "hero.ctaLabel", value: "เริ่มทดสอบฟรีเลย" },
    { key: "hero.ctaHref", value: "/register" },
    { key: "hero.ctaMicro", value: "ไม่ต้องเสียค่าใช้จ่าย ทดสอบได้เลย" },
    { key: "hero.cta2Label", value: "ดูคอร์สทั้งหมด" },
    { key: "hero.cta2Href", value: "/playlists" },
    { key: "hero.stat1.number", value: "500+" },
    { key: "hero.stat1.label", value: "นักเรียน" },
    { key: "hero.stat2.number", value: "4.9" },
    { key: "hero.stat2.label", value: "คะแนนเฉลี่ย" },
    { key: "hero.stat3.number", value: "10+" },
    { key: "hero.stat3.label", value: "แบบทดสอบ" },
    { key: "hero.bgColor", value: "#0f172a" },
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
      where: { key: item.key },
      update: { value: item.value },
      create: item,
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
    const existing = await prisma.faq.findFirst({
      where: { question: item.question },
    });
    if (!existing) {
      await prisma.faq.create({
        data: { ...item, isActive: true },
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
