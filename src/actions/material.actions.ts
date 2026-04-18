"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getR2Client, R2_BUCKET_NAME, deleteObject } from "@/lib/r2";
import {
  SIGNED_URL_EXPIRY,
  ACCEPTED_MATERIAL_MIME_TYPES,
  MAX_MATERIAL_SIZE_BYTES,
  MAX_MATERIALS_PER_VIDEO,
} from "@/lib/constants";
import { isPermissionCurrentlyValid } from "@/lib/permission-utils";
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

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("ไม่มีสิทธิ์");
  return session;
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/** Material record safe for client — s3Key omitted. */
export type PublicMaterial = {
  id: string;
  videoId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  sortOrder: number;
  createdAt: Date;
};

/** Prisma select that excludes s3Key from the result. */
const PUBLIC_MATERIAL_SELECT = {
  id: true,
  videoId: true,
  filename: true,
  contentType: true,
  fileSize: true,
  sortOrder: true,
  createdAt: true,
} as const;

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const CreateMaterialSchema = z.object({
  videoId: z.string().min(1),
  filename: z.string().min(1).max(255),
  s3Key: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().max(MAX_MATERIAL_SIZE_BYTES),
});

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/**
 * Generate a presigned PUT URL for uploading a course material to R2.
 * Key pattern: `materials/<uuid>/<sanitized-filename>`.
 * ADMIN only.
 */
export async function getMaterialUploadUrl(
  filename: string,
  contentType: string
): Promise<ActionResult<{ uploadUrl: string; s3Key: string }>> {
  try {
    await requireAdmin();

    if (
      !(ACCEPTED_MATERIAL_MIME_TYPES as readonly string[]).includes(contentType)
    ) {
      return {
        success: false,
        error: "ประเภทไฟล์ไม่รองรับ",
      };
    }

    const safeName = filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");

    const uid = crypto.randomUUID().replace(/-/g, "");
    const s3Key = `materials/${uid}/${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: SIGNED_URL_EXPIRY,
    });

    return { success: true, data: { uploadUrl, s3Key } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถสร้าง URL สำหรับอัปโหลดได้",
    };
  }
}

/**
 * Save a course material record after the file has been uploaded to R2.
 * Enforces MAX_MATERIALS_PER_VIDEO.
 * ADMIN only.
 */
export async function createMaterial(
  input: z.input<typeof CreateMaterialSchema>
): Promise<ActionResult<PublicMaterial>> {
  try {
    const session = await requireAdmin();

    const data = CreateMaterialSchema.parse(input);

    // Check video exists
    const video = await db.video.findUnique({
      where: { id: data.videoId },
      select: { id: true },
    });
    if (!video) {
      return { success: false, error: "ไม่พบวิดีโอ" };
    }

    // Enforce material count limit
    const count = await db.courseMaterial.count({
      where: { videoId: data.videoId },
    });
    if (count >= MAX_MATERIALS_PER_VIDEO) {
      return {
        success: false,
        error: `จำนวนเอกสารประกอบสูงสุด ${MAX_MATERIALS_PER_VIDEO} ไฟล์ต่อวิดีโอ`,
      };
    }

    // Assign sort order as last item
    const material = await db.courseMaterial.create({
      data: {
        videoId: data.videoId,
        filename: data.filename,
        s3Key: data.s3Key,
        contentType: data.contentType,
        fileSize: data.fileSize,
        sortOrder: count,
      },
      select: PUBLIC_MATERIAL_SELECT,
    });

    logAdminAction(session, "MATERIAL_CREATE", "CourseMaterial", material.id, { videoId: data.videoId, filename: data.filename });
    revalidatePath(`/admin/videos/${data.videoId}`);
    return { success: true, data: material };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "ไม่สามารถบันทึกเอกสารประกอบได้",
    };
  }
}

/**
 * Delete a course material — removes from R2 first, then from DB.
 * ADMIN only.
 */
export async function deleteMaterial(
  materialId: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const material = await db.courseMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, s3Key: true, videoId: true },
    });

    if (!material) {
      return { success: false, error: "ไม่พบเอกสาร" };
    }

    // Delete from R2 first — orphaned DB rows are safer than dangling references
    await deleteObject(material.s3Key);

    await db.courseMaterial.delete({
      where: { id: materialId },
    });

    logAdminAction(session, "MATERIAL_DELETE", "CourseMaterial", materialId, { videoId: material.videoId });
    revalidatePath(`/admin/videos/${material.videoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "ไม่สามารถลบเอกสารประกอบได้",
    };
  }
}

/**
 * Reorder materials within a video.
 * Accepts an array of material IDs in the desired display order.
 * ADMIN only.
 */
export async function reorderMaterials(
  videoId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Verify all IDs belong to this video
    const materials = await db.courseMaterial.findMany({
      where: { videoId },
      select: { id: true },
    });

    const existingIds = new Set(materials.map((m) => m.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return { success: false, error: "เอกสารบางรายการไม่ถูกต้อง" };
      }
    }

    // Update sort order in a transaction
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.courseMaterial.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath(`/admin/videos/${videoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถเรียงลำดับเอกสารใหม่ได้",
    };
  }
}

/**
 * Get all materials for a video.
 * Students: requires valid video permission.
 * Admins: no permission check.
 * s3Key is never returned.
 */
export async function getMaterialsByVideoId(
  videoId: string
): Promise<ActionResult<PublicMaterial[]>> {
  try {
    const session = await requireAuth();

    // Check video exists and is active
    const video = await db.video.findUnique({
      where: { id: videoId, isActive: true },
      select: { id: true },
    });

    if (!video) {
      return { success: false, error: "ไม่พบวิดีโอ" };
    }

    // Permission check for students
    if (session.user.role === "STUDENT") {
      const permission = await db.videoPermission.findUnique({
        where: {
          userId_videoId: { userId: session.user.id, videoId },
        },
        select: { id: true, validFrom: true, validUntil: true },
      });

      if (!permission || !isPermissionCurrentlyValid(permission)) {
        return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };
      }
    }

    const materials = await db.courseMaterial.findMany({
      where: { videoId },
      select: PUBLIC_MATERIAL_SELECT,
      orderBy: { sortOrder: "asc" },
    });

    return { success: true, data: materials };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถโหลดเอกสารประกอบได้",
    };
  }
}

/**
 * Get all materials for a video — admin view (no permission check, includes count).
 * ADMIN only.
 */
export async function getAdminMaterialsByVideoId(
  videoId: string
): Promise<ActionResult<PublicMaterial[]>> {
  try {
    await requireAdmin();

    const materials = await db.courseMaterial.findMany({
      where: { videoId },
      select: PUBLIC_MATERIAL_SELECT,
      orderBy: { sortOrder: "asc" },
    });

    return { success: true, data: materials };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถโหลดเอกสารประกอบได้",
    };
  }
}
