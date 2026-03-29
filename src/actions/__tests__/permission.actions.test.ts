/**
 * Integration-style tests for permission server actions.
 *
 * All external I/O (Prisma, next-auth, next/cache) is mocked.
 * The focus is on the authorization boundary (ADMIN only) and the
 * correctness of the database operations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  makeAdminSession,
  makeStudentSession,
  makeVideoPermission,
  resetFactoryCounters,
} from "@/__tests__/helpers";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    videoPermission: {
      upsert: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    video: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mock registration
// ---------------------------------------------------------------------------

import {
  grantPermission,
  revokePermission,
  bulkGrantPermissions,
  bulkRevokePermissions,
} from "@/actions/permission.actions";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const mockDb = vi.mocked(db);
const mockAuth = vi.mocked(auth);
const mockRevalidatePath = vi.mocked(revalidatePath);

// ---------------------------------------------------------------------------
// grantPermission()
// ---------------------------------------------------------------------------

describe("grantPermission()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("creates a permission record and returns success when called by an admin", async () => {
    const adminSession = makeAdminSession({ id: "admin_1" });
    mockAuth.mockResolvedValue(adminSession);

    const permission = makeVideoPermission({
      userId: "user_1",
      videoId: "video_1",
      grantedBy: "admin_1",
    });
    mockDb.videoPermission.upsert.mockResolvedValue(permission);

    const result = await grantPermission("user_1", "video_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("user_1");
      expect(result.data.videoId).toBe("video_1");
    }
  });

  it("records the admin's id as grantedBy", async () => {
    const adminSession = makeAdminSession({ id: "admin_42" });
    mockAuth.mockResolvedValue(adminSession);
    mockDb.videoPermission.upsert.mockResolvedValue(makeVideoPermission());

    await grantPermission("user_1", "video_1");

    expect(mockDb.videoPermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ grantedBy: "admin_42" }),
      })
    );
  });

  it("uses upsert so granting an already-existing permission is idempotent", async () => {
    const adminSession = makeAdminSession();
    mockAuth.mockResolvedValue(adminSession);
    mockDb.videoPermission.upsert.mockResolvedValue(makeVideoPermission());

    // First grant
    await grantPermission("user_1", "video_1");
    // Second grant (same ids) — should not throw
    await grantPermission("user_1", "video_1");

    expect(mockDb.videoPermission.upsert).toHaveBeenCalledTimes(2);
  });

  it("returns an Unauthorized error when called by a non-admin", async () => {
    const studentSession = makeStudentSession();
    mockAuth.mockResolvedValue(studentSession);

    const result = await grantPermission("user_1", "video_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/unauthorized/i);
    }

    expect(mockDb.videoPermission.upsert).not.toHaveBeenCalled();
  });

  it("returns an Unauthorized error when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await grantPermission("user_1", "video_1");

    expect(result.success).toBe(false);
    expect(mockDb.videoPermission.upsert).not.toHaveBeenCalled();
  });

  it("revalidates the user admin page after a successful grant", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.upsert.mockResolvedValue(makeVideoPermission());

    await grantPermission("user_7", "video_3");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users/user_7");
  });
});

// ---------------------------------------------------------------------------
// revokePermission()
// ---------------------------------------------------------------------------

describe("revokePermission()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("deletes the permission record on success", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.delete.mockResolvedValue(makeVideoPermission());

    const result = await revokePermission("user_1", "video_1");

    expect(result.success).toBe(true);
    expect(mockDb.videoPermission.delete).toHaveBeenCalledWith({
      where: { userId_videoId: { userId: "user_1", videoId: "video_1" } },
    });
  });

  it("returns an Unauthorized error when called by a student", async () => {
    mockAuth.mockResolvedValue(makeStudentSession());

    const result = await revokePermission("user_1", "video_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/unauthorized/i);
    }
    expect(mockDb.videoPermission.delete).not.toHaveBeenCalled();
  });

  it("returns an error when the permission record does not exist", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    // Simulate Prisma throwing when the record is not found
    mockDb.videoPermission.delete.mockRejectedValue(
      new Error("Record to delete does not exist.")
    );

    const result = await revokePermission("user_1", "video_missing");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/record to delete/i);
    }
  });

  it("revalidates the user admin page after a successful revocation", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.delete.mockResolvedValue(makeVideoPermission());

    await revokePermission("user_5", "video_9");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/users/user_5");
  });
});

// ---------------------------------------------------------------------------
// bulkGrantPermissions()
// ---------------------------------------------------------------------------

describe("bulkGrantPermissions()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("grants multiple permissions and returns the count", async () => {
    const adminSession = makeAdminSession({ id: "admin_1" });
    mockAuth.mockResolvedValue(adminSession);
    mockDb.videoPermission.createMany.mockResolvedValue({ count: 3 });

    const result = await bulkGrantPermissions("user_1", ["vid_1", "vid_2", "vid_3"]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(3);
    }
  });

  it("calls createMany with skipDuplicates to be idempotent", async () => {
    mockAuth.mockResolvedValue(makeAdminSession({ id: "admin_1" }));
    mockDb.videoPermission.createMany.mockResolvedValue({ count: 2 });

    await bulkGrantPermissions("user_1", ["vid_1", "vid_2"]);

    expect(mockDb.videoPermission.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });

  it("passes the admin id as grantedBy for every permission row", async () => {
    const adminSession = makeAdminSession({ id: "admin_99" });
    mockAuth.mockResolvedValue(adminSession);
    mockDb.videoPermission.createMany.mockResolvedValue({ count: 2 });

    await bulkGrantPermissions("user_1", ["vid_1", "vid_2"]);

    const callArg = mockDb.videoPermission.createMany.mock.calls[0]?.[0];
    const rows = callArg?.data ?? [];
    for (const row of rows) {
      expect(row.grantedBy).toBe("admin_99");
    }
  });

  it("returns count 0 when an empty videoIds array is provided", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.createMany.mockResolvedValue({ count: 0 });

    const result = await bulkGrantPermissions("user_1", []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(0);
    }
  });

  it("returns an Unauthorized error when called by a non-admin", async () => {
    mockAuth.mockResolvedValue(makeStudentSession());

    const result = await bulkGrantPermissions("user_1", ["vid_1"]);

    expect(result.success).toBe(false);
    expect(mockDb.videoPermission.createMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// bulkRevokePermissions()
// ---------------------------------------------------------------------------

describe("bulkRevokePermissions()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("deletes multiple permissions and returns the count", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.deleteMany.mockResolvedValue({ count: 2 });

    const result = await bulkRevokePermissions("user_1", ["vid_1", "vid_2"]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(2);
    }
  });

  it("calls deleteMany with the correct userId and videoId filter", async () => {
    mockAuth.mockResolvedValue(makeAdminSession());
    mockDb.videoPermission.deleteMany.mockResolvedValue({ count: 1 });

    await bulkRevokePermissions("user_1", ["vid_A"]);

    expect(mockDb.videoPermission.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1", videoId: { in: ["vid_A"] } },
    });
  });

  it("returns an Unauthorized error when called by a student", async () => {
    mockAuth.mockResolvedValue(makeStudentSession());

    const result = await bulkRevokePermissions("user_1", ["vid_1"]);

    expect(result.success).toBe(false);
    expect(mockDb.videoPermission.deleteMany).not.toHaveBeenCalled();
  });
});
