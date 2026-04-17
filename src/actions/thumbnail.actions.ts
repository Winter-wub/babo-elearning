"use server";

import { auth } from "@/lib/auth";
import { getUploadUrl, deleteObject } from "@/lib/r2";
import {
  ACCEPTED_THUMBNAIL_TYPES,
  VIDEO_THUMBNAIL_KEY_PREFIX,
  PLAYLIST_THUMBNAIL_KEY_PREFIX,
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
// Upload actions
// -----------------------------------------------------------------------

/** Generate a presigned PUT URL for uploading a video thumbnail to R2. */
export async function getUploadVideoThumbnailUrl(
  filename: string,
  contentType: string,
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_THUMBNAIL_TYPES.includes(contentType as typeof ACCEPTED_THUMBNAIL_TYPES[number])) {
      return { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง รองรับ: PNG, JPEG, WebP" };
    }

    const id = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${VIDEO_THUMBNAIL_KEY_PREFIX}${id}/${sanitizedFilename}`;

    const uploadUrl = await getUploadUrl(key, contentType);
    return { success: true, data: { uploadUrl, key } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL อัปโหลดได้" };
  }
}

/** Generate a presigned PUT URL for uploading a playlist thumbnail to R2. */
export async function getUploadPlaylistThumbnailUrl(
  filename: string,
  contentType: string,
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_THUMBNAIL_TYPES.includes(contentType as typeof ACCEPTED_THUMBNAIL_TYPES[number])) {
      return { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง รองรับ: PNG, JPEG, WebP" };
    }

    const id = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${PLAYLIST_THUMBNAIL_KEY_PREFIX}${id}/${sanitizedFilename}`;

    const uploadUrl = await getUploadUrl(key, contentType);
    return { success: true, data: { uploadUrl, key } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL อัปโหลดได้" };
  }
}

/** Delete a thumbnail from R2. Silently succeeds if the key doesn't exist. */
export async function deleteThumbnail(key: string): Promise<void> {
  try {
    await requireAdmin();
    if (key.startsWith(VIDEO_THUMBNAIL_KEY_PREFIX) || key.startsWith(PLAYLIST_THUMBNAIL_KEY_PREFIX)) {
      await deleteObject(key);
    }
  } catch {
    // Best-effort cleanup — don't block the caller
  }
}
