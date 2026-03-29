/**
 * Tests for GET /api/videos/[videoId]/signed-url
 *
 * Security matrix covered:
 *   - Unauthenticated request -> 401
 *   - Authenticated + invalid origin -> 403
 *   - Authenticated + valid origin + video not found -> 404
 *   - Authenticated (STUDENT) + valid origin + no permission -> 403
 *   - Authenticated (STUDENT) + valid origin + has permission -> 200 + signed URL
 *   - Authenticated (ADMIN) + valid origin -> 200 (no permission row required)
 *   - Authenticated + null origin AND null referer -> 403
 *   - Authenticated + referer matches app URL -> 200
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeAdminSession, makeStudentSession, makeVideo, makeVideoPermission, resetFactoryCounters } from "@/__tests__/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    video: {
      findUnique: vi.fn(),
    },
    videoPermission: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/r2", () => ({
  getPlaybackUrl: vi.fn().mockResolvedValue("https://r2.example.com/signed?token=abc"),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GET } from "@/app/api/videos/[videoId]/signed-url/route";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaybackUrl } from "@/lib/r2";

const mockAuth = vi.mocked(auth);
const mockDb = vi.mocked(db);
const mockGetPlaybackUrl = vi.mocked(getPlaybackUrl);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_URL = "http://localhost:3000";

/** Build a NextRequest with the given headers and videoId param. */
function makeRequest(
  videoId: string,
  headers: Record<string, string> = {}
): [NextRequest, { params: Promise<{ videoId: string }> }] {
  const request = new NextRequest(`${APP_URL}/api/videos/${videoId}/signed-url`, {
    headers,
  });
  const params = Promise.resolve({ videoId });
  return [request, { params }];
}

/** Returns a request whose Origin matches APP_URL. */
function makeValidOriginRequest(videoId: string, extraHeaders: Record<string, string> = {}) {
  return makeRequest(videoId, { origin: APP_URL, ...extraHeaders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/videos/[videoId]/signed-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();

    // Default env
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe("authentication", () => {
    it("returns 401 when there is no session", async () => {
      mockAuth.mockResolvedValue(null);
      const [req, ctx] = makeValidOriginRequest("video_1");

      const response = await GET(req, ctx);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toMatch(/unauthorized/i);
    });

    it("includes Cache-Control: no-store on 401 response", async () => {
      mockAuth.mockResolvedValue(null);
      const [req, ctx] = makeValidOriginRequest("video_1");

      const response = await GET(req, ctx);

      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  // -------------------------------------------------------------------------
  // Origin / Referer validation
  // -------------------------------------------------------------------------

  describe("origin / referer validation", () => {
    it("returns 403 when both Origin and Referer headers are absent", async () => {
      mockAuth.mockResolvedValue(makeStudentSession());
      // No origin or referer headers
      const [req, ctx] = makeRequest("video_1", {});

      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/forbidden/i);
    });

    it("returns 403 when Origin header is a different domain", async () => {
      mockAuth.mockResolvedValue(makeStudentSession());
      const [req, ctx] = makeRequest("video_1", { origin: "https://evil.example.com" });

      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
    });

    it("returns 403 when Origin is a subdomain of the app URL (not an exact match)", async () => {
      mockAuth.mockResolvedValue(makeStudentSession());
      const [req, ctx] = makeRequest("video_1", { origin: "https://sub.localhost:3000" });

      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
    });

    it("allows the request when Referer starts with the app URL (no Origin header)", async () => {
      const session = makeAdminSession();
      mockAuth.mockResolvedValue(session);

      const video = makeVideo({ id: "video_1" });
      mockDb.video.findUnique.mockResolvedValue(video);

      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=xyz");

      const [req, ctx] = makeRequest("video_1", {
        referer: `${APP_URL}/videos/video_1`,
      });

      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
    });

    it("returns 403 when Referer is from a different origin", async () => {
      mockAuth.mockResolvedValue(makeStudentSession());
      const [req, ctx] = makeRequest("video_1", {
        referer: "https://attacker.example.com/page",
      });

      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // Video lookup
  // -------------------------------------------------------------------------

  describe("video lookup", () => {
    it("returns 404 when the video does not exist", async () => {
      mockAuth.mockResolvedValue(makeAdminSession());
      mockDb.video.findUnique.mockResolvedValue(null);

      const [req, ctx] = makeValidOriginRequest("nonexistent_video");

      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toMatch(/not found/i);
    });

    it("returns 404 when the video is inactive (isActive: false)", async () => {
      // findUnique with { isActive: true } filter will return null for inactive videos
      mockAuth.mockResolvedValue(makeAdminSession());
      mockDb.video.findUnique.mockResolvedValue(null); // isActive filter excluded it

      const [req, ctx] = makeValidOriginRequest("inactive_video");

      const response = await GET(req, ctx);

      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // Authorization (STUDENT)
  // -------------------------------------------------------------------------

  describe("STUDENT authorization", () => {
    it("returns 403 when the student has no VideoPermission for the video", async () => {
      const session = makeStudentSession({ id: "student_1" });
      mockAuth.mockResolvedValue(session);

      const video = makeVideo({ id: "video_1" });
      mockDb.video.findUnique.mockResolvedValue(video);
      mockDb.videoPermission.findUnique.mockResolvedValue(null); // no permission

      const [req, ctx] = makeValidOriginRequest("video_1");

      const response = await GET(req, ctx);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/access denied/i);
    });

    it("returns 200 with a signed URL when the student has a VideoPermission", async () => {
      const session = makeStudentSession({ id: "student_2" });
      mockAuth.mockResolvedValue(session);

      const video = makeVideo({ id: "video_2", s3Key: "videos/abc/lesson.mp4" });
      mockDb.video.findUnique.mockResolvedValue(video);

      const permission = makeVideoPermission({ userId: "student_2", videoId: "video_2" });
      mockDb.videoPermission.findUnique.mockResolvedValue(permission);

      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=def456");

      const [req, ctx] = makeValidOriginRequest("video_2");

      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toBe("https://r2.example.com/signed?token=def456");
      expect(body.expiresAt).toBeTypeOf("number");
    });

    it("generates the signed URL using the video's s3Key", async () => {
      const session = makeStudentSession({ id: "student_3" });
      mockAuth.mockResolvedValue(session);

      const video = makeVideo({ id: "video_3", s3Key: "videos/xyz/specific-key.mp4" });
      mockDb.video.findUnique.mockResolvedValue(video);
      mockDb.videoPermission.findUnique.mockResolvedValue(makeVideoPermission());

      const [req, ctx] = makeValidOriginRequest("video_3");
      await GET(req, ctx);

      expect(mockGetPlaybackUrl).toHaveBeenCalledWith("videos/xyz/specific-key.mp4");
    });
  });

  // -------------------------------------------------------------------------
  // Authorization (ADMIN)
  // -------------------------------------------------------------------------

  describe("ADMIN authorization", () => {
    it("returns 200 for an admin without requiring a VideoPermission row", async () => {
      const adminSession = makeAdminSession({ id: "admin_1" });
      mockAuth.mockResolvedValue(adminSession);

      const video = makeVideo({ id: "video_admin" });
      mockDb.video.findUnique.mockResolvedValue(video);

      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=admintoken");

      const [req, ctx] = makeValidOriginRequest("video_admin");

      const response = await GET(req, ctx);

      expect(response.status).toBe(200);
      // The permission table should not have been queried for admins
      expect(mockDb.videoPermission.findUnique).not.toHaveBeenCalled();
    });

    it("includes Cache-Control: no-store on success response", async () => {
      mockAuth.mockResolvedValue(makeAdminSession());
      const video = makeVideo({ id: "video_cache_check" });
      mockDb.video.findUnique.mockResolvedValue(video);
      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=cache");

      const [req, ctx] = makeValidOriginRequest("video_cache_check");
      const response = await GET(req, ctx);

      const cacheControl = response.headers.get("Cache-Control") ?? "";
      expect(cacheControl).toContain("no-store");
    });
  });

  // -------------------------------------------------------------------------
  // Response structure
  // -------------------------------------------------------------------------

  describe("success response structure", () => {
    it("returns url and expiresAt fields on success", async () => {
      const adminSession = makeAdminSession();
      mockAuth.mockResolvedValue(adminSession);

      const video = makeVideo({ id: "video_structure" });
      mockDb.video.findUnique.mockResolvedValue(video);
      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=structure");

      const [req, ctx] = makeValidOriginRequest("video_structure");
      const response = await GET(req, ctx);
      const body = await response.json();

      expect(body).toHaveProperty("url");
      expect(body).toHaveProperty("expiresAt");
      expect(typeof body.url).toBe("string");
      expect(typeof body.expiresAt).toBe("number");
    });

    it("expiresAt is in the future", async () => {
      const adminSession = makeAdminSession();
      mockAuth.mockResolvedValue(adminSession);

      const video = makeVideo({ id: "video_expiry" });
      mockDb.video.findUnique.mockResolvedValue(video);
      mockGetPlaybackUrl.mockResolvedValue("https://r2.example.com/signed?token=expiry");

      const before = Date.now();
      const [req, ctx] = makeValidOriginRequest("video_expiry");
      const response = await GET(req, ctx);
      const body = await response.json();

      expect(body.expiresAt).toBeGreaterThan(before);
    });
  });
});
