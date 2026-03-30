"use server";

import { db } from "@/lib/db";
import type { ActionResult, PublicPlaylist } from "@/types";

// -----------------------------------------------------------------------
// Public (unauthenticated) actions
// -----------------------------------------------------------------------

/** Featured active playlists, ordered by sortOrder. No auth required. */
export async function getPublicFeaturedPlaylists(
  limit = 4
): Promise<ActionResult<PublicPlaylist[]>> {
  try {
    const playlists = await db.playlist.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
      include: { _count: { select: { videos: true } } },
    });

    const data: PublicPlaylist[] = playlists.map((p) => ({
      id: p.id,
      title: p.title,
      thumbnailUrl: p.thumbnailUrl,
      slug: p.slug,
      videoCount: p._count.videos,
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch featured playlists",
    };
  }
}

/** All active playlists (category browsing), ordered by sortOrder. No auth required. */
export async function getPublicCategoryPlaylists(
  limit = 8
): Promise<ActionResult<PublicPlaylist[]>> {
  try {
    const playlists = await db.playlist.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
      include: { _count: { select: { videos: true } } },
    });

    const data: PublicPlaylist[] = playlists.map((p) => ({
      id: p.id,
      title: p.title,
      thumbnailUrl: p.thumbnailUrl,
      slug: p.slug,
      videoCount: p._count.videos,
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch category playlists",
    };
  }
}
