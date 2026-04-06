"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getSiteContent, bulkUpdateSiteContent } from "@/actions/content.actions";
import { getUploadUrl } from "@/lib/r2";
import {
  THEME_DEFAULTS,
  THEME_KEYS,
  MAX_LOGO_SIZE_BYTES,
  ACCEPTED_LOGO_MIME_TYPES,
} from "@/lib/constants";
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
// Types
// -----------------------------------------------------------------------

export type ThemeSettings = {
  primaryColor: string;
  defaultMode: "light" | "dark";
  radius: string;
  sidebarBg: string;
  sidebarFg: string;
  logoUrl: string;
};

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const ThemeSettingsSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, "รูปแบบสีไม่ถูกต้อง (เช่น #4f46e5)"),
  defaultMode: z.enum(["light", "dark"]),
  radius: z
    .string()
    .refine(
      (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n >= 0 && n <= 2;
      },
      { message: "ค่า radius ต้องอยู่ระหว่าง 0 ถึง 2" }
    ),
  sidebarBg: z.string().regex(hexColorRegex, "รูปแบบสีพื้นหลังแถบข้างไม่ถูกต้อง"),
  sidebarFg: z.string().regex(hexColorRegex, "รูปแบบสีตัวอักษรแถบข้างไม่ถูกต้อง"),
});

// -----------------------------------------------------------------------
// Public — read theme settings (no auth required)
// -----------------------------------------------------------------------

/**
 * Fetch current theme settings from SiteContent.
 * Returns defaults for any missing keys.
 */
export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const keys = Object.values(THEME_KEYS);
    const raw = await getSiteContent(keys);

    return {
      primaryColor: raw[THEME_KEYS.primaryColor] || THEME_DEFAULTS.primaryColor,
      defaultMode:
        (raw[THEME_KEYS.defaultMode] as "light" | "dark") ||
        THEME_DEFAULTS.defaultMode,
      radius: raw[THEME_KEYS.radius] || THEME_DEFAULTS.radius,
      sidebarBg: raw[THEME_KEYS.sidebarBg] || THEME_DEFAULTS.sidebarBg,
      sidebarFg: raw[THEME_KEYS.sidebarFg] || THEME_DEFAULTS.sidebarFg,
      logoUrl: raw[THEME_KEYS.logoUrl] || THEME_DEFAULTS.logoUrl,
    };
  } catch {
    return { ...THEME_DEFAULTS };
  }
}

// -----------------------------------------------------------------------
// Admin — update theme settings
// -----------------------------------------------------------------------

/**
 * Validate and save theme settings to SiteContent (admin-only).
 */
export async function updateThemeSettings(
  settings: Omit<ThemeSettings, "logoUrl">
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();
    ThemeSettingsSchema.parse(settings);

    const entries = [
      { key: THEME_KEYS.primaryColor, value: settings.primaryColor },
      { key: THEME_KEYS.defaultMode, value: settings.defaultMode },
      { key: THEME_KEYS.radius, value: settings.radius },
      { key: THEME_KEYS.sidebarBg, value: settings.sidebarBg },
      { key: THEME_KEYS.sidebarFg, value: settings.sidebarFg },
    ];

    const result = await bulkUpdateSiteContent(entries);
    if (!result.success) return result;

    // Bust cache on all pages so the new theme takes effect
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join(", ")
          : err instanceof Error
            ? err.message
            : "ไม่สามารถบันทึกการตั้งค่าธีมได้",
    };
  }
}

/**
 * Get a presigned upload URL for a theme logo (admin-only).
 * The client uploads directly to R2 via the returned URL,
 * then calls saveThemeLogoKey() with the object key.
 */
export async function getLogoUploadUrl(
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_LOGO_MIME_TYPES.includes(contentType as (typeof ACCEPTED_LOGO_MIME_TYPES)[number])) {
      return { success: false, error: "รูปแบบไฟล์ไม่รองรับ (รองรับ PNG, JPEG, SVG, WebP)" };
    }
    if (fileSize > MAX_LOGO_SIZE_BYTES) {
      return { success: false, error: "ขนาดไฟล์เกิน 2 MB" };
    }

    const ext = fileName.split(".").pop() ?? "png";
    const key = `logos/theme-logo-${Date.now()}.${ext}`;
    const uploadUrl = await getUploadUrl(key, contentType);

    return { success: true, data: { uploadUrl, key } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL สำหรับอัปโหลดได้",
    };
  }
}

/**
 * Save the R2 object key for the uploaded logo (admin-only).
 */
export async function saveThemeLogoKey(
  key: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();

    const entries = [{ key: THEME_KEYS.logoUrl, value: key }];
    const result = await bulkUpdateSiteContent(entries);
    if (!result.success) return result;

    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถบันทึกโลโก้ได้",
    };
  }
}

/**
 * Remove the theme logo (admin-only).
 */
export async function removeThemeLogo(): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();

    const entries = [{ key: THEME_KEYS.logoUrl, value: "" }];
    const result = await bulkUpdateSiteContent(entries);
    if (!result.success) return result;

    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบโลโก้ได้",
    };
  }
}
