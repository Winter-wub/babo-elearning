"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult, PublicPlaylist, PlaylistWithVideos, PaginatedResult } from "@/types";
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
      thumbnailUrl: p.thumbnailUrl,
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
      thumbnailUrl: p.thumbnailUrl,
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
      thumbnailUrl: p.thumbnailUrl,
      slug: p.slug,
      videos: p.videos.map((pv) => ({
        position: pv.position,
        video: pv.video,
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
        videos: {
          include: {
            video: {
              select: {
                id: true,
                title: true,
                description: true,
                duration: true,
                thumbnailUrl: true,
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
      thumbnailUrl: playlist.thumbnailUrl,
      slug: playlist.slug,
      videos: playlist.videos.map((pv) => ({
        position: pv.position,
        video: pv.video,
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
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

const UpdatePlaylistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  slug: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
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
      videos: { videoId: string; position: number; video: Video }[];
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
    await requireAdmin();
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
    await requireAdmin();
    const data = UpdatePlaylistSchema.parse(input);

    // If title changed, regenerate slug unless slug was explicitly provided
    if (data.title && !data.slug) {
      data.slug = generateSlug(data.title);
    }

    const playlist = await db.playlist.update({ where: { id }, data });

    revalidatePath("/admin/playlists");
    revalidatePath(`/admin/playlists/${id}`);
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
    await requireAdmin();
    await db.playlist.delete({ where: { id } });
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
    await requireAdmin();
    await db.playlistVideo.create({ data: { playlistId, videoId, position } });
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
    await requireAdmin();
    await db.playlistVideo.delete({
      where: { playlistId_videoId: { playlistId, videoId } },
    });
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
      select: { id: true, title: true, thumbnailUrl: true, duration: true },
    });
    return { success: true, data: videos };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลวิดีโอได้",
    };
  }
}
