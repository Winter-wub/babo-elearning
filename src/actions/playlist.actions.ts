"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, PLAYLIST_THUMBNAIL_KEY_PREFIX } from "@/lib/constants";
import { resolveThumbnailUrl } from "@/lib/thumbnail-utils";
import { deleteObject } from "@/lib/r2";
import type { ActionResult, PublicPlaylist, PublicPlaylistSection, PlaylistWithVideos, PaginatedResult } from "@/types";
import { logAdminAction } from "@/lib/audit";
import type { Playlist, Video } from "@prisma/client";

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
      thumbnailUrl: resolveThumbnailUrl(p.thumbnailKey, p.thumbnailUrl),
      slug: p.slug,
      videoCount: p._count.videos,
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์แนะนำได้",
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
      thumbnailUrl: resolveThumbnailUrl(p.thumbnailKey, p.thumbnailUrl),
      slug: p.slug,
      videoCount: p._count.videos,
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์หมวดหมู่ได้",
    };
  }
}

/** Active playlists with preview videos for homepage sections. No auth required. */
export async function getPublicPlaylistSections(
  limit = 8,
  videosPerPlaylist = 6
): Promise<ActionResult<PublicPlaylistSection[]>> {
  try {
    const playlists = await db.playlist.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: limit,
      include: {
        _count: { select: { videos: true } },
        videos: {
          orderBy: { position: "asc" },
          take: videosPerPlaylist,
          include: {
            video: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                thumbnailKey: true,
                duration: true,
                playCount: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const data: PublicPlaylistSection[] = playlists
      .filter((p) => p._count.videos > 0)
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        thumbnailUrl: resolveThumbnailUrl(p.thumbnailKey, p.thumbnailUrl),
        slug: p.slug,
        videoCount: p._count.videos,
        videos: p.videos
          .filter((pv) => pv.video.isActive)
          .map((pv) => ({
            id: pv.video.id,
            title: pv.video.title,
            thumbnailUrl: resolveThumbnailUrl(pv.video.thumbnailKey, pv.video.thumbnailUrl),
            duration: pv.video.duration,
            playCount: pv.video.playCount,
          })),
      }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลหมวดหมู่ได้",
    };
  }
}

// -----------------------------------------------------------------------
// Student-facing playlist actions (authenticated)
// -----------------------------------------------------------------------

/** All active playlists with their videos expanded. Used on /playlists browse page. */
export async function getActivePlaylists(): Promise<ActionResult<PlaylistWithVideos[]>> {
  try {
    const playlists = await db.playlist.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        videos: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                thumbnailUrl: true,
                thumbnailKey: true,
                playCount: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    const data: PlaylistWithVideos[] = playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      thumbnailUrl: resolveThumbnailUrl(p.thumbnailKey, p.thumbnailUrl),
      slug: p.slug,
      videos: p.videos.map((pv) => ({
        position: pv.position,
        video: {
          ...pv.video,
          thumbnailUrl: resolveThumbnailUrl(pv.video.thumbnailKey, pv.video.thumbnailUrl),
        },
      })),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์ได้",
    };
  }
}

/** Single playlist by slug with videos expanded. Used on /playlists/[slug] detail page. */
export async function getPlaylistBySlug(
  slug: string
): Promise<ActionResult<PlaylistWithVideos | null>> {
  try {
    const playlist = await db.playlist.findUnique({
      where: { slug, isActive: true },
      include: {
        demoVideo: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            thumbnailKey: true,
            duration: true,
          },
        },
        videos: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                thumbnailUrl: true,
                thumbnailKey: true,
                playCount: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!playlist) {
      return { success: true, data: null };
    }

    const data: PlaylistWithVideos = {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      thumbnailUrl: resolveThumbnailUrl(playlist.thumbnailKey, playlist.thumbnailUrl),
      slug: playlist.slug,
      demoVideo: playlist.demoVideo
        ? {
            id: playlist.demoVideo.id,
            title: playlist.demoVideo.title,
            thumbnailUrl: resolveThumbnailUrl(playlist.demoVideo.thumbnailKey, playlist.demoVideo.thumbnailUrl),
            duration: playlist.demoVideo.duration,
          }
        : null,
      videos: playlist.videos.map((pv) => ({
        position: pv.position,
        video: {
          ...pv.video,
          thumbnailUrl: resolveThumbnailUrl(pv.video.thumbnailKey, pv.video.thumbnailUrl),
        },
      })),
    };

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์ได้",
    };
  }
}

// -----------------------------------------------------------------------
// Admin helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// -----------------------------------------------------------------------
// Admin schemas
// -----------------------------------------------------------------------

const CreatePlaylistSchema = z.object({
  title: z.string().min(1, "จำเป็นต้องระบุชื่อ").max(255),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional(),
  thumbnailKey: z.string().optional().nullable(),
  thumbnailAlt: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

const UpdatePlaylistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  thumbnailKey: z.string().optional().nullable(),
  thumbnailAlt: z.string().max(255).optional().nullable(),
  slug: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  demoVideoId: z.string().cuid().optional().nullable(),
});

const GetPlaylistsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
});

// -----------------------------------------------------------------------
// Admin CRUD actions
// -----------------------------------------------------------------------

export type PlaylistWithCount = Playlist & { _count: { videos: number } };

/** List all playlists (admin). */
export async function getPlaylists(
  input: z.input<typeof GetPlaylistsSchema> = {}
): Promise<ActionResult<PaginatedResult<PlaylistWithCount>>> {
  try {
    await requireAdmin();
    const { page, pageSize, search } = GetPlaylistsSchema.parse(input);

    const where = search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {};

    const [items, total] = await Promise.all([
      db.playlist.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { videos: true } } },
      }),
      db.playlist.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์ได้",
    };
  }
}

/** Get a single playlist by ID (admin). */
export async function getPlaylistById(
  id: string
): Promise<
  ActionResult<
    Playlist & {
      videos: { videoId: string; position: number; video: Omit<Video, "s3Key"> }[];
    }
  >
> {
  try {
    await requireAdmin();
    const playlist = await db.playlist.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { video: { omit: { s3Key: true } } },
        },
      },
    });

    if (!playlist) return { success: false, error: "ไม่พบเพลย์ลิสต์" };
    return { success: true, data: playlist };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเพลย์ลิสต์ได้",
    };
  }
}

/** Create a playlist with auto-generated slug. */
export async function createPlaylist(
  input: z.input<typeof CreatePlaylistSchema>
): Promise<ActionResult<Playlist>> {
  try {
    const session = await requireAdmin();
    const data = CreatePlaylistSchema.parse(input);
    const slug = generateSlug(data.title);

    const existing = await db.playlist.findUnique({ where: { slug } });
    if (existing) {
      return {
        success: false,
        error: "มีเพลย์ลิสต์ที่มีชื่อคล้ายกันอยู่แล้ว (slug ซ้ำ)",
      };
    }

    const playlist = await db.playlist.create({ data: { ...data, slug } });

    logAdminAction(session, "PLAYLIST_CREATE", "Playlist", playlist.id, { title: data.title });
    revalidatePath("/admin/playlists");
    return { success: true, data: playlist };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้างเพลย์ลิสต์ได้",
    };
  }
}

/** Update a playlist. */
export async function updatePlaylist(
  id: string,
  input: z.input<typeof UpdatePlaylistSchema>
): Promise<ActionResult<Playlist>> {
  try {
    const session = await requireAdmin();
    const data = UpdatePlaylistSchema.parse(input);

    // Validate demoVideoId references an active video
    if (data.demoVideoId) {
      const videoExists = await db.video.findUnique({
        where: { id: data.demoVideoId, isActive: true },
        select: { id: true },
      });
      if (!videoExists) return { success: false, error: "ไม่พบวิดีโอที่เลือก" };
    }

    // Validate thumbnailKey prefix if provided
    if (data.thumbnailKey && !data.thumbnailKey.startsWith(PLAYLIST_THUMBNAIL_KEY_PREFIX)) {
      return { success: false, error: "Invalid thumbnail key prefix" };
    }

    // If title changed, regenerate slug unless slug was explicitly provided
    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    // Clean up old R2 thumbnail if replacing or removing
    if (data.thumbnailKey !== undefined) {
      const existing = await db.playlist.findUnique({ where: { id }, select: { thumbnailKey: true } });
      if (existing?.thumbnailKey && existing.thumbnailKey !== data.thumbnailKey) {
        deleteObject(existing.thumbnailKey).catch(() => {});
      }
      // Clear legacy thumbnailUrl when using R2 key
      if (data.thumbnailKey) {
        data.thumbnailUrl = null;
      }
    }

    const playlist = await db.playlist.update({ where: { id }, data });

    logAdminAction(session, "PLAYLIST_UPDATE", "Playlist", id, { title: data.title });
    revalidatePath("/admin/playlists");
    revalidatePath(`/admin/playlists/${id}`);
    revalidatePath(`/playlists/${playlist.slug}`);
    revalidatePath("/courses");
    return { success: true, data: playlist };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตเพลย์ลิสต์ได้",
    };
  }
}

/** Delete a playlist. */
export async function deletePlaylist(id: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    // Clean up R2 thumbnail and content block files before deleting the record
    const existing = await db.playlist.findUnique({
      where: { id },
      select: {
        thumbnailKey: true,
        contentBlocks: { select: { s3Key: true } },
      },
    });
    if (existing?.thumbnailKey) {
      deleteObject(existing.thumbnailKey).catch(() => {});
    }
    for (const block of existing?.contentBlocks ?? []) {
      if (block.s3Key) deleteObject(block.s3Key).catch(() => {});
    }
    await db.playlist.delete({ where: { id } });
    logAdminAction(session, "PLAYLIST_DELETE", "Playlist", id);
    revalidatePath("/admin/playlists");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบเพลย์ลิสต์ได้",
    };
  }
}

/** Add a video to a playlist. */
export async function addVideoToPlaylist(
  playlistId: string,
  videoId: string,
  position: number = 0
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    await db.playlistVideo.create({ data: { playlistId, videoId, position } });
    logAdminAction(session, "PLAYLIST_ADD_VIDEO", "Playlist", playlistId, { videoId });
    revalidatePath(`/admin/playlists/${playlistId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถเพิ่มวิดีโอในเพลย์ลิสต์ได้",
    };
  }
}

/** Remove a video from a playlist. */
export async function removeVideoFromPlaylist(
  playlistId: string,
  videoId: string
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    await db.playlistVideo.delete({
      where: { playlistId_videoId: { playlistId, videoId } },
    });
    logAdminAction(session, "PLAYLIST_REMOVE_VIDEO", "Playlist", playlistId, { videoId });
    revalidatePath(`/admin/playlists/${playlistId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบวิดีโอออกจากเพลย์ลิสต์ได้",
    };
  }
}

/** Reorder videos in a playlist. videoIds array defines the new order. */
export async function reorderPlaylistVideos(
  playlistId: string,
  videoIds: string[]
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();
    await db.$transaction(
      videoIds.map((videoId, index) =>
        db.playlistVideo.update({
          where: { playlistId_videoId: { playlistId, videoId } },
          data: { position: index },
        })
      )
    );
    revalidatePath(`/admin/playlists/${playlistId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถจัดเรียงวิดีโอใหม่ได้",
    };
  }
}

/** Get all videos (for the video picker when adding to playlist). */
export async function getAllVideosForPicker(): Promise<
  ActionResult<Pick<Video, "id" | "title" | "thumbnailUrl" | "duration">[]>
> {
  try {
    await requireAdmin();
    const videos = await db.video.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, thumbnailUrl: true, thumbnailKey: true, duration: true },
    });
    const data = videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumbnailUrl: resolveThumbnailUrl(v.thumbnailKey, v.thumbnailUrl),
      duration: v.duration,
    }));
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้",
    };
  }
}
