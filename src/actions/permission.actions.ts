"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type { Video, VideoPermission } from "@prisma/client";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type VideoPermissionWithVideo = VideoPermission & { video: Video };

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** Grant a student access to a single video. ADMIN only. Idempotent. */
export async function grantPermission(
  userId: string,
  videoId: string
): Promise<ActionResult<VideoPermission>> {
  try {
    const session = await requireAdmin();

    const permission = await db.videoPermission.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {},
      create: { userId, videoId, grantedBy: session.user.id },
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: permission };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to grant permission",
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
      error: err instanceof Error ? err.message : "Failed to revoke permission",
    };
  }
}

/** Grant a student access to multiple videos in one operation. ADMIN only. */
export async function bulkGrantPermissions(
  userId: string,
  videoIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireAdmin();

    // TODO(security/medium): Validate array size to prevent abuse.
    // Recommended: if (videoIds.length > 100) return { success: false, error: "Too many videos" };
    // Also validate that videoIds are non-empty strings to prevent malformed DB queries.

    const result = await db.videoPermission.createMany({
      data: videoIds.map((videoId) => ({
        userId,
        videoId,
        grantedBy: session.user.id,
      })),
      skipDuplicates: true,
    });

    revalidatePath(`/admin/users/${userId}`);
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to bulk grant permissions",
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
      error: err instanceof Error ? err.message : "Failed to revoke permissions",
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
      error: err instanceof Error ? err.message : "Failed to fetch permissions",
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
      error: err instanceof Error ? err.message : "Failed to fetch available videos",
    };
  }
}

/**
 * Returns ALL active videos with a boolean flag indicating
 * whether the user currently has access. ADMIN only.
 */
export async function getAllVideosWithPermissionStatus(
  userId: string
): Promise<ActionResult<(Video & { hasPermission: boolean })[]>> {
  try {
    await requireAdmin();

    const [videos, permissions] = await Promise.all([
      db.video.findMany({ where: { isActive: true }, orderBy: { title: "asc" } }),
      db.videoPermission.findMany({ where: { userId }, select: { videoId: true } }),
    ]);

    const grantedSet = new Set(permissions.map((p) => p.videoId));

    return {
      success: true,
      data: videos.map((v) => ({ ...v, hasPermission: grantedSet.has(v.id) })),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch video permissions",
    };
  }
}
