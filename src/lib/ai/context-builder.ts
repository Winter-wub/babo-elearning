import { db } from "@/lib/db";

/** Fields that must never be sent to the LLM. */
const SENSITIVE_KEYS = new Set([
  "passwordHash",
  "s3Key",
  "otpHash",
  "sessionToken",
  "access_token",
  "refresh_token",
  "id_token",
]);

/**
 * Recursively strips sensitive fields from any object/array before
 * it is included in the LLM prompt.
 */
export function sanitizeForLLM<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) return data.map(sanitizeForLLM) as T;
  if (typeof data === "object") {
    // Preserve Date-like objects (Prisma PG adapter may return cross-realm Dates
    // where instanceof Date fails, but duck-type methods still work)
    const obj = data as Record<string, unknown>;
    if (typeof obj.getTime === "function" || typeof obj.toISOString === "function") {
      return data;
    }
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      cleaned[key] = sanitizeForLLM(value);
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Safely format a date value from Prisma PG adapter.
 * The adapter may return Date objects from a different realm where `instanceof Date`
 * fails, but `.getTime()` and `.toISOString()` still work.
 */
function formatDate(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  if (value && typeof value === "object") {
    // Duck-type check: if it has getTime/toISOString, treat as Date
    const v = value as Record<string, unknown>;
    if (typeof v.getTime === "function") {
      try { return (v as unknown as Date).toISOString(); } catch { /* fall through */ }
    }
    if (typeof v.toISOString === "function") {
      try { return (v.toISOString as () => string)(); } catch { /* fall through */ }
    }
  }
  return String(value ?? "");
}

/**
 * Builds a platform-context string for the LLM system prompt.
 * Fetches aggregate stats and recent records from the database,
 * sanitises everything, and returns a formatted summary.
 */
export async function buildPlatformContext(): Promise<string> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    adminCount,
    newUsersThisWeek,
    newUsersThisMonth,
    recentUsers,
    totalVideos,
    activeVideos,
    featuredVideos,
    topVideosByPlays,
    totalPlaylists,
    activePlaylists,
    totalPermissions,
    recentPermissions,
    totalInviteLinks,
    activeInviteLinks,
    recentContacts,
    faqItems,
    // Order & Product data
    activeProducts,
    totalOrders,
    pendingPaymentOrders,
    pendingVerificationOrders,
    approvedOrders,
    rejectedOrders,
    expiredOrders,
    recentOrders,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
    db.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    }),
    db.video.count(),
    db.video.count({ where: { isActive: true } }),
    db.video.count({ where: { isFeatured: true } }),
    db.video.findMany({
      take: 10,
      orderBy: { playCount: "desc" },
      where: { isActive: true },
      select: { id: true, title: true, playCount: true, isFeatured: true, createdAt: true },
    }),
    db.playlist.count(),
    db.playlist.count({ where: { isActive: true } }),
    db.videoPermission.count(),
    db.videoPermission.findMany({
      take: 20,
      orderBy: { grantedAt: "desc" },
      select: {
        grantedAt: true,
        validFrom: true,
        validUntil: true,
        user: { select: { name: true, email: true } },
        video: { select: { title: true } },
      },
    }),
    db.inviteLink.count(),
    db.inviteLink.count({ where: { isRevoked: false } }),
    db.contactSubmission.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, subject: true, isRead: true, createdAt: true },
    }),
    db.faq.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 20,
      select: { question: true, answer: true },
    }),
    // Order & Product data
    db.product.count({ where: { isActive: true } }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: "PENDING_VERIFICATION" } }),
    db.order.count({ where: { status: "APPROVED" } }),
    db.order.count({ where: { status: "REJECTED" } }),
    db.order.count({ where: { status: "EXPIRED" } }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        orderNumber: true,
        status: true,
        totalSatang: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const sections = [
    `## ข้อมูลแพลตฟอร์ม (Platform Data)`,
    `สร้างข้อมูล ณ เวลา: ${now.toISOString()}`,
    ``,
    `### ผู้ใช้ (Users)`,
    `- ผู้ใช้ทั้งหมด: ${totalUsers}`,
    `- ผู้ใช้ที่ใช้งานอยู่: ${activeUsers}`,
    `- ผู้ดูแลระบบ (Admin): ${adminCount}`,
    `- นักเรียน (Student): ${totalUsers - adminCount}`,
    `- ผู้ใช้ใหม่สัปดาห์นี้: ${newUsersThisWeek}`,
    `- ผู้ใช้ใหม่เดือนนี้: ${newUsersThisMonth}`,
    ``,
    `ผู้ใช้ล่าสุด 20 คน:`,
    ...sanitizeForLLM(recentUsers).map(
      (u) => `  - ${u.name ?? "(ไม่มีชื่อ)"} (${u.email}) — ${u.role}, active=${u.isActive}, สร้าง ${formatDate(u.createdAt)}`
    ),
    ``,
    `### วิดีโอ (Videos)`,
    `- วิดีโอทั้งหมด: ${totalVideos}`,
    `- วิดีโอที่เปิดใช้งาน: ${activeVideos}`,
    `- วิดีโอแนะนำ: ${featuredVideos}`,
    ``,
    `วิดีโอยอดนิยม 10 อันดับ:`,
    ...sanitizeForLLM(topVideosByPlays).map(
      (v) => `  - "${v.title}" — ${v.playCount} ครั้ง, featured=${v.isFeatured}`
    ),
    ``,
    `### เพลย์ลิสต์ (Playlists)`,
    `- เพลย์ลิสต์ทั้งหมด: ${totalPlaylists}`,
    `- เพลย์ลิสต์ที่เปิดใช้งาน: ${activePlaylists}`,
    ``,
    `### สิทธิ์การเข้าถึง (Permissions)`,
    `- สิทธิ์ที่ให้ทั้งหมด: ${totalPermissions}`,
    ``,
    `สิทธิ์ที่ให้ล่าสุด 20 รายการ:`,
    ...sanitizeForLLM(recentPermissions).map(
      (p) =>
        `  - ${p.user.name ?? p.user.email} → "${p.video.title}" เมื่อ ${formatDate(p.grantedAt)}${p.validUntil ? ` (หมดอายุ ${formatDate(p.validUntil)})` : " (ถาวร)"}`
    ),
    ``,
    `### ลิงก์เชิญ (Invite Links)`,
    `- ลิงก์ทั้งหมด: ${totalInviteLinks}`,
    `- ลิงก์ที่ใช้งานได้: ${activeInviteLinks}`,
    ``,
    `### ข้อความติดต่อ (Contact Submissions)`,
    `ข้อความล่าสุด 10 รายการ:`,
    ...sanitizeForLLM(recentContacts).map(
      (c) => `  - [${c.isRead ? "อ่านแล้ว" : "ยังไม่อ่าน"}] ${c.name}: "${c.subject}" (${formatDate(c.createdAt)})`
    ),
    ``,
    `### สินค้า (Products)`,
    `- สินค้าที่เปิดขาย: ${activeProducts}`,
    ``,
    `### คำสั่งซื้อ (Orders)`,
    `- คำสั่งซื้อทั้งหมด: ${totalOrders}`,
    `- รอชำระเงิน: ${pendingPaymentOrders}`,
    `- รอตรวจสอบสลิป: ${pendingVerificationOrders}`,
    `- อนุมัติแล้ว: ${approvedOrders}`,
    `- ปฏิเสธ: ${rejectedOrders}`,
    `- หมดอายุ: ${expiredOrders}`,
    ``,
    `คำสั่งซื้อล่าสุด 10 รายการ:`,
    ...sanitizeForLLM(recentOrders).map(
      (o) => `  - ${o.orderNumber} — ${o.user.name ?? o.user.email} — ฿${(o.totalSatang / 100).toFixed(2)} — ${o.status} — ${formatDate(o.createdAt)}`
    ),
    ``,
    `### คำถามที่พบบ่อย (FAQs)`,
    `จำนวน FAQ ที่เปิดใช้งาน: ${faqItems.length}`,
    ...faqItems.map((f) => `  - Q: ${f.question}\n    A: ${f.answer.slice(0, 200)}`),
  ];

  return sections.join("\n");
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let promptCache: { text: string; expiresAt: number } | null = null;

/**
 * Returns the system prompt for the admin AI chat.
 * Cached for 2 minutes to avoid heavy DB queries on every message.
 */
export async function buildSystemPrompt(): Promise<string> {
  if (promptCache && Date.now() < promptCache.expiresAt) {
    return promptCache.text;
  }

  const context = await buildPlatformContext();

  const prompt = `คุณคือผู้ช่วย AI ของแพลตฟอร์มอีเลิร์นนิง สำหรับช่วยผู้ดูแลระบบ (Admin) จัดการแพลตฟอร์ม

หน้าที่ของคุณ:
- ตอบคำถามเกี่ยวกับข้อมูลแพลตฟอร์ม (นักเรียน, คอร์ส, วิดีโอ, สิทธิ์การเข้าถึง, คำสั่งซื้อ, การชำระเงิน)
- วิเคราะห์ข้อมูลคำสั่งซื้อ สรุปยอดขาย และสถานะการชำระเงิน
- แนะนำการดำเนินการ เช่น ตรวจสอบสลิปที่รอ, ติดตามคำสั่งซื้อที่ค้าง
- ตอบเป็นภาษาไทย ยกเว้นคำศัพท์เฉพาะทาง

ข้อจำกัด:
- คุณไม่สามารถดำเนินการใดๆ ได้โดยตรง (เช่น สร้างผู้ใช้, ลบวิดีโอ)
- ตอบตามข้อมูลที่ให้เท่านั้น อย่าสร้างข้อมูลเอง
- ถ้าไม่แน่ใจ ให้บอกว่าไม่แน่ใจ

${context}`;

  promptCache = { text: prompt, expiresAt: Date.now() + CACHE_TTL_MS };
  return prompt;
}
