"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getR2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { DEFAULT_PAGE_SIZE, MAX_VIDEO_DURATION, SIGNED_URL_EXPIRY } from "@/lib/constants";
import { isPermissionCurrentlyValid } from "@/lib/permission-utils";
import type { ActionResult, PaginatedResult, PublicVideo, VideoWithPermissions } from "@/types";
import type { Video } from "@prisma/client";

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
// Schemas
// -----------------------------------------------------------------------

const GetVideosSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const CreateVideoSchema = z.object({
  title: z.string().min(1, "จำเป็นต้องระบุชื่อ").max(255),
  description: z.string().max(2000).optional(),
  s3Key: z.string().min(1, "จำเป็นต้องระบุ s3Key"),
  duration: z
    .number()
    .int()
    .positive()
    .max(MAX_VIDEO_DURATION, `Duration must be at most ${MAX_VIDEO_DURATION} seconds`),
  thumbnailUrl: z.string().url().optional(),
});

const UpdateVideoSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** All videos (admin view). ADMIN only. */
export async function getVideos(
  filters: z.input<typeof GetVideosSchema> = {}
): Promise<ActionResult<PaginatedResult<Video>>> {
  try {
    const session = await requireAdmin();
    const { page, pageSize, search, isActive } = GetVideosSchema.parse(filters);

    const where = {
      tenantId: session.user.activeTenantId!,
      ...(search && { title: { contains: search, mode: "insensitive" as const } }),
      ...(isActive !== undefined && { isActive }),
    };

    const [total, videos] = await Promise.all([
      db.video.count({ where }),
      db.video.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: {
        items: videos,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้" };
  }
}

/** Video with optional expiry info for student-facing display. */
export type PermittedVideo = Omit<Video, "s3Key"> & {
  s3Key: "";
  validUntil: Date | null;
};

/** Videos the current student has access to. Filters out expired/not-yet-active. */
export async function getPermittedVideos(): Promise<ActionResult<PermittedVideo[]>> {
  try {
    const session = await requireAuth();

    const permissions = await db.videoPermission.findMany({
      where: { userId: session.user.id, tenantId: session.user.activeTenantId! },
      include: { video: true },
    });

    const now = new Date();
    const results: PermittedVideo[] = permissions
      .filter((p) => p.video.isActive && isPermissionCurrentlyValid(p, now))
      .map((p) => {
        const { s3Key, ...rest } = p.video;
        return { ...rest, s3Key: "" as const, validUntil: p.validUntil };
      });

    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้" };
  }
}

/** Single video — checks permission for STUDENT, open for ADMIN. */
export async function getVideoById(
  id: string
): Promise<ActionResult<VideoWithPermissions>> {
  try {
    const session = await requireAuth();

    const isAdmin = session.user.role === "ADMIN";

    const video = await db.video.findUnique({
      where: { id, tenantId: session.user.activeTenantId!, ...(!isAdmin && { isActive: true }) },
      include: { permissions: { include: { user: { omit: { passwordHash: true } } } } },
    });

    if (!video) return { success: false, error: "ไม่พบวิดีโอ" };

    // Students must have explicit permission.
    if (!isAdmin) {
      const hasPermission = video.permissions.some(
        (p) => p.userId === session.user.id
      );
      if (!hasPermission) return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };
    }

    return { success: true, data: video };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้" };
  }
}

/** Insert video metadata record. ADMIN only. */
export async function createVideo(
  data: z.infer<typeof CreateVideoSchema>
): Promise<ActionResult<Video>> {
  try {
    const session = await requireAdmin();
    const parsed = CreateVideoSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const video = await db.video.create({ data: { ...parsed.data, tenantId: session.user.activeTenantId! } });
    return { success: true, data: video };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างวิดีโอได้" };
  }
}

/** Edit title, description, or isActive. ADMIN only. */
export async function updateVideo(
  id: string,
  data: z.infer<typeof UpdateVideoSchema>
): Promise<ActionResult<Video>> {
  try {
    const session = await requireAdmin();
    const parsed = UpdateVideoSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const video = await db.video.update({ where: { id, tenantId: session.user.activeTenantId! }, data: parsed.data });
    revalidatePath("/admin/videos");
    return { success: true, data: video };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตวิดีโอได้" };
  }
}

/** Soft-delete: set isActive=false. ADMIN only. */
export async function deleteVideo(id: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    await db.video.update({ where: { id, tenantId: session.user.activeTenantId! }, data: { isActive: false } });
    revalidatePath("/admin/videos");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบวิดีโอได้" };
  }
}

// -----------------------------------------------------------------------
// Safe field selector — never expose s3Key to unauthenticated callers.
// -----------------------------------------------------------------------

const PUBLIC_VIDEO_SELECT = {
  id: true,
  title: true,
  description: true,
  duration: true,
  thumbnailUrl: true,
  createdAt: true,
  playCount: true,
  isFeatured: true,
} as const;

// -----------------------------------------------------------------------
// Public (unauthenticated) actions
// -----------------------------------------------------------------------

/** Latest active videos, newest first. No auth required. */
export async function getPublicLatestVideos(
  tenantId: string,
  limit = 8
): Promise<ActionResult<PublicVideo[]>> {
  try {
    const videos = await db.video.findMany({
      where: { isActive: true, tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: PUBLIC_VIDEO_SELECT,
    });
    return { success: true, data: videos };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอล่าสุดได้" };
  }
}

/** Most-played active videos, highest play count first. No auth required. */
export async function getPublicMostPlayedVideos(
  tenantId: string,
  limit = 8
): Promise<ActionResult<PublicVideo[]>> {
  try {
    const videos = await db.video.findMany({
      where: { isActive: true, playCount: { gt: 0 }, tenantId },
      orderBy: { playCount: "desc" },
      take: limit,
      select: PUBLIC_VIDEO_SELECT,
    });
    return { success: true, data: videos };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอยอดนิยมได้" };
  }
}

/** Featured active videos, newest first. No auth required. */
export async function getPublicFeaturedVideos(tenantId: string): Promise<ActionResult<PublicVideo[]>> {
  try {
    const videos = await db.video.findMany({
      where: { isActive: true, isFeatured: true, tenantId },
      orderBy: { createdAt: "desc" },
      select: PUBLIC_VIDEO_SELECT,
    });
    return { success: true, data: videos };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอแนะนำได้" };
  }
}

/** Trending active videos, highest play count first. No auth required. */
export async function getPublicTrendingVideos(
  tenantId: string,
  limit = 10
): Promise<ActionResult<PublicVideo[]>> {
  try {
    const videos = await db.video.findMany({
      where: { isActive: true, tenantId },
      orderBy: { playCount: "desc" },
      take: limit,
      select: PUBLIC_VIDEO_SELECT,
    });
    return { success: true, data: videos };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอมาแรงได้" };
  }
}

/** Increment the play count for a video by 1. Auth required. */
export async function incrementPlayCount(videoId: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    await db.video.update({
      where: { id: videoId, tenantId: session.user.activeTenantId! },
      data: { playCount: { increment: 1 } },
    });
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเพิ่มจำนวนการเล่นได้" };
  }
}

/**
 * Generate a presigned PUT URL so the client can upload directly to R2.
 * The key pattern is `videos/<cuid>/<original-filename>` to keep objects
 * organised and guarantee uniqueness even for identically-named files.
 * ADMIN only.
 */
export async function getUploadPresignedUrl(
  filename: string,
  contentType: string
): Promise<ActionResult<{ uploadUrl: string; s3Key: string }>> {
  try {
    await requireAdmin();

    // Validate content type to prevent upload of non-video files
    const ALLOWED_CONTENT_TYPES = ["video/mp4", "video/webm"];
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง อนุญาตเฉพาะ video/mp4 และ video/webm เท่านั้น" };
    }

    // Sanitise the filename: strip directory traversal characters and
    // collapse whitespace so the key stays URL-safe.
    const safeName = filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");

    // crypto.randomUUID() is available in Node 14.17+ and modern browsers.
    const uid = crypto.randomUUID().replace(/-/g, "");
    const s3Key = `videos/${uid}/${safeName}`;

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
      error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL สำหรับอัปโหลดได้",
    };
  }
}
