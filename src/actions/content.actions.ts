"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { SiteContent } from "@prisma/client";
import { logAdminAction } from "@/lib/audit";
import { getUploadUrl } from "@/lib/r2";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Marketing assets (About page images + intro video) constants
// -----------------------------------------------------------------------

const MARKETING_ASSETS_PREFIX = "marketing-assets/";

const MARKETING_MEDIA_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const UpdateSiteContentSchema = z.object({
  key: z.string().min(1, "จำเป็นต้องระบุคีย์").max(255),
  value: z.string().max(10000),
});

const MediaUploadInputSchema = z.object({
  filename: z.string().min(1, "ต้องระบุชื่อไฟล์").max(255),
  contentType: z.enum(MARKETING_MEDIA_CONTENT_TYPES),
});

/**
 * Sanitize an uploaded filename: strip path separators, lowercase,
 * replace disallowed chars with "-", clamp base name to 100 chars.
 */
function sanitizeMarketingFilename(filename: string): string {
  // Drop any directory portion that a browser might include
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;

  // Split off the final extension to enforce length on the base only
  const lastDot = base.lastIndexOf(".");
  const rawName = lastDot > 0 ? base.slice(0, lastDot) : base;
  const rawExt = lastDot > 0 ? base.slice(lastDot) : "";

  const cleanName = rawName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "file";

  const cleanExt = rawExt
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return `${cleanName}${cleanExt}`;
}

// Hero content validation is handled in src/components/home/hero-data.ts
// via isSafeHref() and isValidHex() in parseHeroContent().

// -----------------------------------------------------------------------
// Public actions
// -----------------------------------------------------------------------

/**
 * Fetch multiple SiteContent entries by their keys.
 * Returns a record mapping each found key to its value.
 * Missing keys are simply absent from the result — callers should use fallback defaults.
 */
export async function getSiteContent(
  keys: string[]
): Promise<Record<string, string>> {
  const items = await db.siteContent.findMany({
    where: { key: { in: keys } },
  });

  const map: Record<string, string> = {};
  for (const item of items) {
    map[item.key] = item.value;
  }
  return map;
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

/** Get all SiteContent entries by prefix (admin). */
export async function getSiteContentByPrefix(
  prefix: string
): Promise<ActionResult<SiteContent[]>> {
  try {
    await requireAdmin();
    const items = await db.siteContent.findMany({
      where: { key: { startsWith: prefix } },
      orderBy: { key: "asc" },
    });
    return { success: true, data: items };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเนื้อหาได้",
    };
  }
}

const REQUIRED_KEYS: Record<string, string> = {
  "contact.line.url": "",
};

/** Get all SiteContent entries (admin). Auto-creates any missing required keys. */
export async function getAllSiteContent(): Promise<ActionResult<SiteContent[]>> {
  try {
    await requireAdmin();
    const items = await db.siteContent.findMany({ orderBy: { key: "asc" } });

    const existingKeys = new Set(items.map((i) => i.key));
    const missing = Object.entries(REQUIRED_KEYS).filter(([k]) => !existingKeys.has(k));
    if (missing.length > 0) {
      const created = await db.$transaction(
        missing.map(([key, value]) =>
          db.siteContent.upsert({ where: { key }, update: {}, create: { key, value } })
        )
      );
      items.push(...created);
      items.sort((a, b) => a.key.localeCompare(b.key));
    }

    return { success: true, data: items };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเนื้อหาได้",
    };
  }
}

/** Upsert a SiteContent entry. */
export async function updateSiteContent(
  key: string,
  value: string
): Promise<ActionResult<SiteContent>> {
  try {
    const session = await requireAdmin();
    UpdateSiteContentSchema.parse({ key, value });

    const item = await db.siteContent.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    logAdminAction(session, "CONTENT_UPDATE", "SiteContent", key);
    revalidatePath("/admin/content");
    // Revalidate any public pages that might consume this content
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/privacy");
    revalidatePath("/terms");
    return { success: true, data: item };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตเนื้อหาได้",
    };
  }
}

/**
 * Bulk upsert multiple SiteContent entries.
 * NOTE: This function does not emit its own audit log because callers
 * (updateThemeSettings, saveThemeLogoKey, updateOAuthProvider) each
 * produce their own audit entry with richer context. If you call this
 * directly from a new feature, add a logAdminAction call at the call site.
 */
export async function bulkUpdateSiteContent(
  entries: { key: string; value: string }[]
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();

    // Validate all entries
    for (const entry of entries) {
      UpdateSiteContentSchema.parse(entry);
    }

    await db.$transaction(
      entries.map((entry) =>
        db.siteContent.upsert({
          where: { key: entry.key },
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value },
        })
      )
    );

    revalidatePath("/admin/content");
    revalidatePath("/admin/payment-methods");
    revalidatePath("/admin/hero");
    revalidatePath("/checkout");
    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");
    revalidatePath("/privacy");
    revalidatePath("/terms");
    revalidatePath("/faq");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตเนื้อหาได้",
    };
  }
}

// -----------------------------------------------------------------------
// Marketing assets — public images & video for the About page
// -----------------------------------------------------------------------

/**
 * Generate a presigned PUT URL for uploading a marketing asset
 * (image or short video) used on the public About page.
 *
 * Key shape: `marketing-assets/<uuid>/<sanitized-filename>`.
 * `publicUrl` is the same-origin proxy path the admin should store in
 * `SiteContent` — the browser will then fetch through the public
 * proxy route at /api/marketing-assets/[...key].
 *
 * ADMIN only.
 */
export async function getSiteContentMediaUploadUrl(input: {
  filename: string;
  contentType: string;
}): Promise<
  ActionResult<{ uploadUrl: string; key: string; publicUrl: string }>
> {
  try {
    await requireAdmin();

    const parsed = MediaUploadInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "ประเภทไฟล์หรือชื่อไฟล์ไม่รองรับ" };
    }

    const { filename, contentType } = parsed.data;
    const safeName = sanitizeMarketingFilename(filename);
    const path = `${crypto.randomUUID()}/${safeName}`;
    const key = `${MARKETING_ASSETS_PREFIX}${path}`;

    const uploadUrl = await getUploadUrl(key, contentType);

    return {
      success: true,
      data: {
        uploadUrl,
        key,
        publicUrl: `/api/marketing-assets/${path}`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "ไม่สามารถสร้าง URL สำหรับอัปโหลดได้",
    };
  }
}
