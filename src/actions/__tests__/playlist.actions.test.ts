/**
 * Unit tests for playlist and trending video server actions.
 *
 * External dependencies (Prisma, next-auth, R2, etc.) are all mocked so
 * these tests run without a database or auth server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePlaylist, makeVideo, resetFactoryCounters } from "@/__tests__/helpers";

// ---------------------------------------------------------------------------
// Mock: Prisma db client
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    playlist: {
      findMany: vi.fn(),
    },
    video: {
      findMany: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock: next-auth (required by video.actions.ts transitive imports)
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: R2 client (required by video.actions.ts)
// ---------------------------------------------------------------------------

vi.mock("@/lib/r2", () => ({
  getR2Client: vi.fn(),
  R2_BUCKET_NAME: "test-bucket",
}));

// ---------------------------------------------------------------------------
// Mock: next/cache (required by video.actions.ts)
// ---------------------------------------------------------------------------

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @aws-sdk/client-s3 (required by video.actions.ts)
// ---------------------------------------------------------------------------

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @aws-sdk/s3-request-presigner (required by video.actions.ts)
// ---------------------------------------------------------------------------

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks are registered
// ---------------------------------------------------------------------------

import { getPublicFeaturedPlaylists, getPublicCategoryPlaylists } from "@/actions/playlist.actions";
import { getPublicTrendingVideos } from "@/actions/video.actions";
import { db } from "@/lib/db";

const mockDb = vi.mocked(db);

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("getPublicFeaturedPlaylists()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("returns featured playlists mapped to PublicPlaylist shape", async () => {
    const playlist1 = makePlaylist({ isFeatured: true, isActive: true }, "tenant_1");
    const playlist2 = makePlaylist({ isFeatured: true, isActive: true }, "tenant_1");

    (mockDb.playlist.findMany as unknown as any).mockResolvedValue([
      { ...playlist1, _count: { videos: 3 } },
      { ...playlist2, _count: { videos: 5 } },
    ] as any);

    const result = await getPublicFeaturedPlaylists("tenant_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: playlist1.id,
        title: playlist1.title,
        thumbnailUrl: playlist1.thumbnailUrl,
        slug: playlist1.slug,
        videoCount: 3,
      });
      expect(result.data[1]).toEqual({
        id: playlist2.id,
        title: playlist2.title,
        thumbnailUrl: playlist2.thumbnailUrl,
        slug: playlist2.slug,
        videoCount: 5,
      });
    }

    // Verify the correct query was made
    expect(mockDb.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, isFeatured: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      })
    );
  });

  it("returns an error when the database throws", async () => {
    (mockDb.playlist.findMany as unknown as any).mockRejectedValue(new Error("Connection refused"));

    const result = await getPublicFeaturedPlaylists("tenant_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Connection refused");
    }
  });

  it("respects the limit parameter", async () => {
    (mockDb.playlist.findMany as unknown as any).mockResolvedValue([]);

    await getPublicFeaturedPlaylists("tenant_1", 2);

    expect(mockDb.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 })
    );
  });
});

// ---------------------------------------------------------------------------
// getPublicCategoryPlaylists()
// ---------------------------------------------------------------------------

describe("getPublicCategoryPlaylists()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("returns category playlists mapped to PublicPlaylist shape", async () => {
    const playlist1 = makePlaylist({ isActive: true }, "tenant_1");
    const playlist2 = makePlaylist({ isActive: true }, "tenant_1");
    const playlist3 = makePlaylist({ isActive: true }, "tenant_1");

    (mockDb.playlist.findMany as unknown as any).mockResolvedValue([
      { ...playlist1, _count: { videos: 2 } },
      { ...playlist2, _count: { videos: 0 } },
      { ...playlist3, _count: { videos: 7 } },
    ] as any);

    const result = await getPublicCategoryPlaylists("tenant_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].videoCount).toBe(2);
      expect(result.data[1].videoCount).toBe(0);
      expect(result.data[2].videoCount).toBe(7);
    }

    expect(mockDb.playlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 8,
      })
    );
  });

  it("returns an error when the database throws", async () => {
    (mockDb.playlist.findMany as unknown as any).mockRejectedValue(new Error("Timeout"));

    const result = await getPublicCategoryPlaylists("tenant_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Timeout");
    }
  });
});

// ---------------------------------------------------------------------------
// getPublicTrendingVideos()
// ---------------------------------------------------------------------------

describe("getPublicTrendingVideos()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("returns trending videos ordered by playCount descending", async () => {
    const video1 = makeVideo({ playCount: 500, isActive: true }, "tenant_1");
    const video2 = makeVideo({ playCount: 200, isActive: true }, "tenant_1");

    (mockDb.video.findMany as unknown as any).mockResolvedValue([video1, video2]);

    const result = await getPublicTrendingVideos("tenant_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }

    expect(mockDb.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: { playCount: "desc" },
        take: 10,
      })
    );
  });

  it("respects the limit parameter", async () => {
    (mockDb.video.findMany as unknown as any).mockResolvedValue([]);

    await getPublicTrendingVideos("tenant_1", 5);

    expect(mockDb.video.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  it("returns an error when the database throws", async () => {
    (mockDb.video.findMany as unknown as any).mockRejectedValue(new Error("DB down"));

    const result = await getPublicTrendingVideos("tenant_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("DB down");
    }
  });
});
