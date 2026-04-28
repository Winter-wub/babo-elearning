"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { SiteContent } from "@prisma/client";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

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

/** Get all SiteContent entries (admin). */
export async function getAllSiteContent(): Promise<ActionResult<SiteContent[]>> {
  try {
    await requireAdmin();
    const items = await db.siteContent.findMany({ orderBy: { key: "asc" } });
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
