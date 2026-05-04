"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getUploadUrl, getMaterialViewUrl, getMaterialDownloadUrl, deleteObject } from "@/lib/r2";
import {
  SIGNED_URL_EXPIRY,
  CONTENT_BLOCK_KEY_PREFIX,
  ACCEPTED_CONTENT_BLOCK_IMAGE_TYPES,
  ACCEPTED_CONTENT_BLOCK_VIDEO_TYPES,
  ACCEPTED_CONTENT_BLOCK_PDF_TYPES,
  MAX_CONTENT_BLOCK_IMAGE_SIZE,
  MAX_CONTENT_BLOCK_FILE_SIZE,
} from "@/lib/constants";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Auth helpers
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

export type ContentBlockType = "TEXT" | "IMAGE" | "VIDEO" | "PDF";

/** Content block shape returned to admin — includes s3Key for editing. */
export type AdminContentBlock = {
  id: string;
  playlistId: string;
  type: ContentBlockType;
  sortOrder: number;
  content: string | null;
  s3Key: string | null;
  filename: string | null;
  contentType: string | null;
  fileSize: number | null;
  alt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Content block shape safe for public page — s3Key omitted, viewUrl added. */
export type PublicContentBlock = {
  id: string;
  playlistId: string;
  type: ContentBlockType;
  sortOrder: number;
  content: string | null;
  filename: string | null;
  contentType: string | null;
  fileSize: number | null;
  alt: string | null;
  viewUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const ADMIN_SELECT = {
  id: true,
  playlistId: true,
  type: true,
  sortOrder: true,
  content: true,
  s3Key: true,
  filename: true,
  contentType: true,
  fileSize: true,
  alt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const ACCEPTED_FILE_TYPES: readonly string[] = [
  ...ACCEPTED_CONTENT_BLOCK_IMAGE_TYPES,
  ...ACCEPTED_CONTENT_BLOCK_VIDEO_TYPES,
  ...ACCEPTED_CONTENT_BLOCK_PDF_TYPES,
];

const CreateContentBlockSchema = z.object({
  playlistId: z.string().min(1),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "PDF"]),
  content: z.string().optional(),
  s3Key: z.string().optional(),
  filename: z.string().max(255).optional(),
  contentType: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  alt: z.string().max(255).optional(),
});

const UpdateContentBlockSchema = z.object({
  content: z.string().optional(),
  s3Key: z.string().optional(),
  filename: z.string().max(255).optional(),
  contentType: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  alt: z.string().max(255).optional(),
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function contentBlockProxyUrl(s3Key: string): string {
  return `/api/content-blocks/${s3Key}`;
}

async function blockToPublic(block: AdminContentBlock): Promise<PublicContentBlock> {
  const { s3Key, ...rest } = block;
  return {
    ...rest,
    viewUrl: s3Key ? contentBlockProxyUrl(s3Key) : null,
  };
}

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/**
 * Generate a presigned PUT URL for uploading a content block file to R2.
 * Key pattern: `content-blocks/<uuid>/<sanitized-filename>`.
 * ADMIN only.
 */
export async function getContentBlockUploadUrl(
  filename: string,
  contentType: string
): Promise<ActionResult<{ uploadUrl: string; s3Key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_FILE_TYPES.includes(contentType)) {
      return { success: false, error: "ประเภทไฟล์ไม่รองรับ" };
    }

    const safeName = filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");

    const uid = crypto.randomUUID().replace(/-/g, "");
    const s3Key = `${CONTENT_BLOCK_KEY_PREFIX}${uid}/${safeName}`;

    const uploadUrl = await getUploadUrl(s3Key, contentType);
    return { success: true, data: { uploadUrl, s3Key } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL สำหรับอัปโหลดได้",
    };
  }
}

/**
 * Save a content block record after the file has been uploaded to R2 (or with rich text).
 * Auto-assigns sortOrder as max+1.
 * ADMIN only.
 */
export async function createContentBlock(
  input: z.input<typeof CreateContentBlockSchema>
): Promise<ActionResult<AdminContentBlock>> {
  try {
    const session = await requireAdmin();
    const data = CreateContentBlockSchema.parse(input);

    const playlist = await db.playlist.findUnique({
      where: { id: data.playlistId },
      select: { id: true },
    });
    if (!playlist) {
      return { success: false, error: "ไม่พบ Playlist" };
    }

    const maxBlock = await db.playlistContentBlock.findFirst({
      where: { playlistId: data.playlistId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const nextSortOrder = maxBlock ? maxBlock.sortOrder + 1 : 0;

    const block = await db.playlistContentBlock.create({
      data: {
        playlistId: data.playlistId,
        type: data.type,
        sortOrder: nextSortOrder,
        content: data.content ?? null,
        s3Key: data.s3Key ?? null,
        filename: data.filename ?? null,
        contentType: data.contentType ?? null,
        fileSize: data.fileSize ?? null,
        alt: data.alt ?? null,
      },
      select: ADMIN_SELECT,
    });

    logAdminAction(session, "CONTENT_BLOCK_CREATE", "PlaylistContentBlock", block.id, {
      playlistId: data.playlistId,
      type: data.type,
    });
    revalidatePath(`/admin/playlists/${data.playlistId}`);
    revalidatePath(`/playlists`, "layout");

    return { success: true, data: block as AdminContentBlock };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้าง content block ได้",
    };
  }
}

/**
 * Update a content block's content or file.
 * If s3Key changes, the old R2 object is deleted.
 * ADMIN only.
 */
export async function updateContentBlock(
  blockId: string,
  input: z.input<typeof UpdateContentBlockSchema>
): Promise<ActionResult<AdminContentBlock>> {
  try {
    const session = await requireAdmin();
    const data = UpdateContentBlockSchema.parse(input);

    const existing = await db.playlistContentBlock.findUnique({
      where: { id: blockId },
      select: { id: true, playlistId: true, s3Key: true },
    });
    if (!existing) {
      return { success: false, error: "ไม่พบ content block" };
    }

    // Delete old R2 object if s3Key is being replaced
    if (data.s3Key !== undefined && existing.s3Key && data.s3Key !== existing.s3Key) {
      try {
        await deleteObject(existing.s3Key);
      } catch {
        // Non-fatal — log but continue
      }
    }

    const block = await db.playlistContentBlock.update({
      where: { id: blockId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.s3Key !== undefined && { s3Key: data.s3Key }),
        ...(data.filename !== undefined && { filename: data.filename }),
        ...(data.contentType !== undefined && { contentType: data.contentType }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        ...(data.alt !== undefined && { alt: data.alt }),
      },
      select: ADMIN_SELECT,
    });

    logAdminAction(session, "CONTENT_BLOCK_UPDATE", "PlaylistContentBlock", blockId, {
      playlistId: existing.playlistId,
    });
    revalidatePath(`/admin/playlists/${existing.playlistId}`);
    revalidatePath(`/playlists`, "layout");

    return { success: true, data: block as AdminContentBlock };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดต content block ได้",
    };
  }
}

/**
 * Delete a content block — removes R2 object first (if file block), then DB record.
 * ADMIN only.
 */
export async function deleteContentBlock(blockId: string): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const block = await db.playlistContentBlock.findUnique({
      where: { id: blockId },
      select: { id: true, playlistId: true, s3Key: true },
    });
    if (!block) {
      return { success: false, error: "ไม่พบ content block" };
    }

    if (block.s3Key) {
      try {
        await deleteObject(block.s3Key);
      } catch {
        // Non-fatal
      }
    }

    await db.playlistContentBlock.delete({ where: { id: blockId } });

    logAdminAction(session, "CONTENT_BLOCK_DELETE", "PlaylistContentBlock", blockId, {
      playlistId: block.playlistId,
    });
    revalidatePath(`/admin/playlists/${block.playlistId}`);
    revalidatePath(`/playlists`, "layout");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบ content block ได้",
    };
  }
}

/**
 * Reorder content blocks within a playlist.
 * Accepts an array of block IDs in the desired display order.
 * ADMIN only.
 */
export async function reorderContentBlocks(
  playlistId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const blocks = await db.playlistContentBlock.findMany({
      where: { playlistId },
      select: { id: true },
    });

    const existingIds = new Set(blocks.map((b) => b.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return { success: false, error: "Content block บางรายการไม่ถูกต้อง" };
      }
    }

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.playlistContentBlock.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath(`/admin/playlists/${playlistId}`);
    revalidatePath(`/playlists`, "layout");

    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถเรียงลำดับใหม่ได้",
    };
  }
}

/**
 * Get all content blocks for a playlist — admin view (includes s3Key).
 * ADMIN only.
 */
export async function getAdminContentBlocks(
  playlistId: string
): Promise<ActionResult<AdminContentBlock[]>> {
  try {
    await requireAdmin();

    const blocks = await db.playlistContentBlock.findMany({
      where: { playlistId },
      select: ADMIN_SELECT,
      orderBy: { sortOrder: "asc" },
    });

    return { success: true, data: blocks as AdminContentBlock[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถโหลด content blocks ได้",
    };
  }
}

/**
 * Get all public content blocks for a playlist — s3Key omitted, viewUrl added.
 * No auth required (public page).
 */
export async function getPublicContentBlocks(
  playlistId: string
): Promise<ActionResult<PublicContentBlock[]>> {
  try {
    const blocks = await db.playlistContentBlock.findMany({
      where: { playlistId },
      select: ADMIN_SELECT,
      orderBy: { sortOrder: "asc" },
    });

    const publicBlocks = await Promise.all(
      (blocks as AdminContentBlock[]).map(blockToPublic)
    );

    return { success: true, data: publicBlocks };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถโหลด content blocks ได้",
    };
  }
}
