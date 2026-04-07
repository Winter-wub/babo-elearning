/**
 * Tests for student-facing video server actions.
 *
 * External I/O (Prisma, next-auth) is mocked. Focus is on:
 *   - getPermittedVideos: auth gate, inactive filtering, s3Key stripping
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeStudentSession, makeVideo, makeVideoPermission, resetFactoryCounters } from "@/__tests__/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    videoPermission: {
      findMany: vi.fn(),
    },
    video: {
      findMany: vi.fn(),
    },
  },
}));

// vi.mock for auth removed


vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  getR2Client: vi.fn(),
  R2_BUCKET_NAME: "test-bucket",
}));

// ---------------------------------------------------------------------------
// Imports after mock registration
// ---------------------------------------------------------------------------

import { getPermittedVideos } from "@/actions/video.actions";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const mockDb = db as unknown as {
  videoPermission: {
    findMany: import("vitest").MockInstance;
  };
  video: {
    findMany: import("vitest").MockInstance;
  };
};

const mockAuthFn = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: any[]) => mockAuthFn(...args),
}));

const mockAuth = mockAuthFn as unknown as import("vitest").MockInstance;

// ---------------------------------------------------------------------------
// getPermittedVideos()
// ---------------------------------------------------------------------------

describe("getPermittedVideos()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("returns the student's permitted active videos", async () => {
    const session = makeStudentSession({ id: "user_1" });
    mockAuth.mockResolvedValue(session);

    const video = makeVideo({ id: "video_1" });
    const permission = { ...makeVideoPermission({ userId: "user_1", videoId: "video_1" }), video };
    mockDb.videoPermission.findMany.mockResolvedValue([permission]);

    const result = await getPermittedVideos();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("video_1");
    }
  });

  it("returns an empty array when the student has no permissions", async () => {
    mockAuth.mockResolvedValue(makeStudentSession());
    mockDb.videoPermission.findMany.mockResolvedValue([]);

    const result = await getPermittedVideos();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("filters out inactive videos", async () => {
    mockAuth.mockResolvedValue(makeStudentSession({ id: "user_1" }));

    const activeVideo = makeVideo({ id: "video_active", isActive: true });
    const inactiveVideo = makeVideo({ id: "video_inactive", isActive: false });
    mockDb.videoPermission.findMany.mockResolvedValue([
      { ...makeVideoPermission(), video: activeVideo },
      { ...makeVideoPermission(), video: inactiveVideo },
    ]);

    const result = await getPermittedVideos();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("video_active");
    }
  });

  it("does not expose s3Key in the returned data", async () => {
    mockAuth.mockResolvedValue(makeStudentSession({ id: "user_1" }));

    const video = makeVideo({ s3Key: "videos/secret/path.mp4" });
    mockDb.videoPermission.findMany.mockResolvedValue([
      { ...makeVideoPermission(), video },
    ]);

    const result = await getPermittedVideos();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].s3Key).toBe("");
    }
  });

  it("returns an error when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getPermittedVideos();

    expect(result.success).toBe(false);
    expect(mockDb.videoPermission.findMany).not.toHaveBeenCalled();
  });

  it("returns an error when the database throws", async () => {
    mockAuth.mockResolvedValue(makeStudentSession());
    mockDb.videoPermission.findMany.mockRejectedValue(new Error("Connection refused"));

    const result = await getPermittedVideos();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/connection refused/i);
    }
  });

  it("queries permissions only for the authenticated user's id", async () => {
    const session = makeStudentSession({ id: "user_42" });
    mockAuth.mockResolvedValue(session);
    mockDb.videoPermission.findMany.mockResolvedValue([]);

    await getPermittedVideos();

    expect(mockDb.videoPermission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_42" } })
    );
  });
});
