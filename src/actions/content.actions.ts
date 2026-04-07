"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/actions/helpers";
import type { SiteContent } from "@prisma/client";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const UpdateSiteContentSchema = z.object({
  key: z.string().min(1, "จำเป็นต้องระบุคีย์").max(255),
  value: z.string().max(10000),
});

// -----------------------------------------------------------------------
// Public actions
// -----------------------------------------------------------------------

/**
 * Fetch multiple SiteContent entries by their keys.
 * Returns a record mapping each found key to its value.
 * Missing keys are simply absent from the result — callers should use fallback defaults.
 */
export async function getSiteContent(
  keys: string[],
  tenantId: string
): Promise<Record<string, string>> {
  const items = await db.siteContent.findMany({
    where: { key: { in: keys }, tenantId },
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
    const { tenantId } = await requireAdmin();
    const items = await db.siteContent.findMany({
      where: { key: { startsWith: prefix }, tenantId },
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
    const { tenantId } = await requireAdmin();
    const items = await db.siteContent.findMany({ where: { tenantId }, orderBy: { key: "asc" } });
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
    const { tenantId } = await requireAdmin();
    UpdateSiteContentSchema.parse({ key, value });

    const item = await db.siteContent.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value },
      create: { key, value, tenantId },
    });

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

/** Bulk upsert multiple SiteContent entries. */
export async function bulkUpdateSiteContent(
  entries: { key: string; value: string }[]
): Promise<ActionResult<undefined>> {
  try {
    const { tenantId } = await requireAdmin();

    // Validate all entries
    for (const entry of entries) {
      UpdateSiteContentSchema.parse(entry);
    }

    await db.$transaction(
      entries.map((entry) =>
        db.siteContent.upsert({
          where: { tenantId_key: { tenantId, key: entry.key } },
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value, tenantId },
        })
      )
    );

    revalidatePath("/admin/content");
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
