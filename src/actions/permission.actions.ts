"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  resolveTimeFields,
  getPermissionTimeStatus,
  isPermissionCurrentlyValid,
  type PermissionTimeConfig,
  type PermissionTimeStatus,
} from "@/lib/permission-utils";
import type { ActionResult, PaginatedResult, SafeUser, SafePermissionRow, VideoPermissionWithVideo } from "@/types";
import type { Video, VideoPermission } from "@prisma/client";

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
// Zod Schemas
// -----------------------------------------------------------------------

const PermissionTimeConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("permanent") }),
  z.object({
    mode: z.literal("relative"),
    durationDays: z.number().int().positive().max(3650),
  }),
  z.object({
    mode: z.literal("absolute"),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
  }),
]).refine(
  (val) => {
    if (val.mode === "absolute") return val.validUntil > val.validFrom;
    return true;
  },
  { message: "วันที่สิ้นสุดต้องหลังจากวันที่เริ่มต้น" },
);

// -----------------------------------------------------------------------
// Types (SafePermissionRow, VideoPermissionWithVideo, PermissionTimeConfig
// are defined in @/types and @/lib/permission-utils — server action files
// can only export async functions)
// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** Grant a student access to a single video. ADMIN only. Idempotent. Re-grant updates time fields. */
export async function grantPermission(
  userId: string,
  videoId: string,
  timeConfig: PermissionTimeConfig = { mode: "permanent" },
): Promise<ActionResult<VideoPermission>> {
  try {
    const session = await requireAdmin();
    PermissionTimeConfigSchema.parse(timeConfig);
    const now = new Date();
    const timeFields = resolveTimeFields(timeConfig, now);

    const permission = await db.videoPermission.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { ...timeFields },
      create: { userId, videoId, grantedBy: session.user.id, grantedAt: now, ...timeFields },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: permission };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถให้สิทธิ์ได้",
    };
  }
}

/** Revoke a student's access to a single video. ADMIN only. */
export async function revokePermission(
  userId: string,
  videoId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();

    await db.videoPermission.delete({
      where: { userId_videoId: { userId, videoId } },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถเพิกถอนสิทธิ์ได้",
    };
  }
}

/** Grant a student access to multiple videos in one operation. ADMIN only. */
export async function bulkGrantPermissions(
  userId: string,
  videoIds: string[],
  timeConfig: PermissionTimeConfig = { mode: "permanent" },
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireAdmin();
    PermissionTimeConfigSchema.parse(timeConfig);

    if (videoIds.length > 100) {
      return { success: false, error: "วิดีโอมากเกินไป (สูงสุด 100)" };
    }

    const now = new Date();
    const timeFields = resolveTimeFields(timeConfig, now);

    const result = await db.videoPermission.createMany({
      data: videoIds.map((videoId) => ({
        userId,
        videoId,
        grantedBy: session.user.id,
        grantedAt: now,
        ...timeFields,
      })),
      skipDuplicates: true,
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถให้สิทธิ์แบบกลุ่มได้",
    };
  }
}

/** Revoke all permissions for a user at once. ADMIN only. */
export async function bulkRevokePermissions(
  userId: string,
  videoIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdmin();

    // TODO(security/medium): Validate array size to prevent abuse (same as bulkGrantPermissions).

    const result = await db.videoPermission.deleteMany({
      where: { userId, videoId: { in: videoIds } },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถเพิกถอนสิทธิ์ได้",
    };
  }
}

/** All VideoPermissions for a user, including video details. ADMIN only. */
export async function getUserPermissions(
  userId: string
): Promise<ActionResult<VideoPermissionWithVideo[]>> {
  try {
    await requireAdmin();

    const permissions = await db.videoPermission.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { grantedAt: "desc" },
    });

    return { success: true, data: permissions };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสิทธิ์ได้",
    };
  }
}

/**
 * Returns all active videos NOT yet granted to this user.
 * Used to populate the "grant" picker. ADMIN only.
 */
export async function getAvailableVideos(
  userId: string
): Promise<ActionResult<Video[]>> {
  try {
    await requireAdmin();

    const videos = await db.video.findMany({
      where: {
        isActive: true,
        permissions: { none: { userId } },
      },
      orderBy: { title: "asc" },
    });

    return { success: true, data: videos };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอที่พร้อมใช้งานได้",
    };
  }
}

/**
 * Returns ALL active videos with a boolean flag indicating
 * whether the user currently has active access. ADMIN only.
 * Time-expired or not-yet-active permissions are treated as no access.
 */
export async function getAllVideosWithPermissionStatus(
  userId: string
): Promise<ActionResult<(Video & { hasPermission: boolean })[]>> {
  try {
    await requireAdmin();

    const [videos, permissions] = await Promise.all([
      db.video.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
      db.videoPermission.findMany({
        where: { userId },
        select: { videoId: true, validFrom: true, validUntil: true },
      }),
    ]);

    const now = new Date();
    const grantedSet = new Set(
      permissions
        .filter((p) => isPermissionCurrentlyValid(p, now))
        .map((p) => p.videoId),
    );

    return {
      success: true,
      data: videos.map((v) => ({ ...v, hasPermission: grantedSet.has(v.id) })),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสิทธิ์วิดีโอได้",
    };
  }
}

// -----------------------------------------------------------------------
// Bulk Permission Management (for /admin/permissions page)
// -----------------------------------------------------------------------

/** Paginated permissions with user and video info. ADMIN only. Omits s3Key and passwordHash. */
export async function getPermissionsPage(
  page: number = 1,
  pageSize: number = 20,
  filters?: { search?: string; videoId?: string; status?: PermissionTimeStatus }
): Promise<ActionResult<PaginatedResult<SafePermissionRow>>> {
  try {
    await requireAdmin();

    const where: Record<string, unknown> = {};

    if (filters?.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
        ],
      };
    }

    if (filters?.videoId) {
      where.videoId = filters.videoId;
    }

    // Apply time-based status filter at DB level where possible
    if (filters?.status) {
      const now = new Date();
      switch (filters.status) {
        case "permanent":
          where.validFrom = null;
          where.validUntil = null;
          break;
        case "expired":
          where.validUntil = { lt: now };
          break;
        case "not_yet_active":
          where.validFrom = { gt: now };
          break;
        case "active":
          // Active = has time fields AND currently within window
          where.OR = [
            // Has validUntil in the future (and validFrom is null or in the past)
            { validUntil: { gte: now }, OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
            // Has validFrom in the past with no expiry
            { validUntil: null, validFrom: { lte: now } },
          ];
          break;
      }
    }

    const [total, permissions] = await Promise.all([
      db.videoPermission.count({ where }),
      db.videoPermission.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          video: { select: { id: true, title: true } },
        },
        orderBy: { grantedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const now = new Date();
    const items: SafePermissionRow[] = permissions.map((p) => ({
      ...p,
      status: getPermissionTimeStatus(
        { validFrom: p.validFrom, validUntil: p.validUntil },
        now,
      ),
    }));

    return {
      success: true,
      data: {
        items,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสิทธิ์ได้",
    };
  }
}

/**
 * Grant permissions for multiple users x multiple videos (cartesian product).
 * ADMIN only.
 */
export async function bulkGrantPermissionsMulti(
  userIds: string[],
  videoIds: string[],
  timeConfig: PermissionTimeConfig = { mode: "permanent" },
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireAdmin();
    PermissionTimeConfigSchema.parse(timeConfig);

    if (userIds.length === 0 || videoIds.length === 0) {
      return { success: false, error: "ต้องเลือกอย่างน้อยหนึ่งผู้ใช้และหนึ่งวิดีโอ" };
    }

    if (userIds.length * videoIds.length > 500) {
      return { success: false, error: "สิทธิ์มากเกินไป (สูงสุด 500)" };
    }

    const now = new Date();
    const timeFields = resolveTimeFields(timeConfig, now);

    const data: { userId: string; videoId: string; grantedBy: string; grantedAt: Date; validFrom: Date | null; validUntil: Date | null; durationDays: number | null }[] = [];
    for (const userId of userIds) {
      for (const videoId of videoIds) {
        data.push({ userId, videoId, grantedBy: session.user.id, grantedAt: now, ...timeFields });
      }
    }

    const result = await db.videoPermission.createMany({
      data,
      skipDuplicates: true,
    });

    revalidatePath("/admin/permissions");
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถให้สิทธิ์แบบกลุ่มได้",
    };
  }
}

/** Revoke multiple permissions by their IDs. ADMIN only. */
export async function bulkRevokePermissionsByIds(
  permissionIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdmin();

    if (permissionIds.length === 0) {
      return { success: false, error: "ไม่ได้เลือกสิทธิ์" };
    }

    if (permissionIds.length > 500) {
      return { success: false, error: "สิทธิ์มากเกินไป (สูงสุด 500)" };
    }

    const result = await db.videoPermission.deleteMany({
      where: { id: { in: permissionIds } },
    });

    revalidatePath("/admin/permissions");
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "ไม่สามารถเพิกถอนสิทธิ์ได้",
    };
  }
}

/** Update the time configuration of an existing permission. ADMIN only. */
export async function updatePermissionExpiry(
  permissionId: string,
  timeConfig: PermissionTimeConfig,
): Promise<ActionResult<VideoPermission>> {
  try {
    await requireAdmin();
    PermissionTimeConfigSchema.parse(timeConfig);

    const existing = await db.videoPermission.findUnique({
      where: { id: permissionId },
      select: { grantedAt: true },
    });
    if (!existing) return { success: false, error: "ไม่พบสิทธิ์" };

    const timeFields = resolveTimeFields(timeConfig, existing.grantedAt);

    const updated = await db.videoPermission.update({
      where: { id: permissionId },
      data: timeFields,
    });

    revalidatePath("/admin/permissions");
    return { success: true, data: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตวันหมดอายุสิทธิ์ได้",
    };
  }
}

/** Get all users (for permission grant dialog). ADMIN only. Returns safe user data. */
export async function getAllUsersForSelect(): Promise<
  ActionResult<{ id: string; name: string | null; email: string }[]>
> {
  try {
    await requireAdmin();

    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: users };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลผู้ใช้ได้",
    };
  }
}

/** Get all active videos (for permission grant dialog). ADMIN only. Omits s3Key. */
export async function getAllVideosForSelect(): Promise<
  ActionResult<{ id: string; title: string }[]>
> {
  try {
    await requireAdmin();

    const videos = await db.video.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });

    return { success: true, data: videos };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้",
    };
  }
}
