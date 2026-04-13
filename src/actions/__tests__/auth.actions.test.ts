/**
 * Integration-style tests for auth server actions.
 *
 * External dependencies (Prisma, next-auth) are all mocked so
 * these tests run without a database or auth server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makePolicyAgreement, makeStudentSession, resetFactoryCounters } from "@/__tests__/helpers";

// ---------------------------------------------------------------------------
// Mock: next/headers (used by acceptPolicy to read IP)
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: Prisma db client
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    pendingRegistration: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    policyAgreement: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: next-auth (auth())
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks are registered
// ---------------------------------------------------------------------------

import { acceptPolicy, checkPolicyAgreement } from "@/actions/auth.actions";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const mockDb = vi.mocked(db);
const mockAuth = vi.mocked(auth);
const mockHeaders = vi.mocked(headers);

/** Returns a mock ReadonlyHeaders-like object for the given header map. */
function makeHeadersMap(entries: Record<string, string> = {}) {
  return {
    get: (key: string) => entries[key.toLowerCase()] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>;
}

// ---------------------------------------------------------------------------
// acceptPolicy()
// ---------------------------------------------------------------------------

describe("acceptPolicy()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("creates a policy agreement record when the user is authenticated", async () => {
    const session = makeStudentSession({ id: "student_1" });
    mockAuth.mockResolvedValue(session);
    mockHeaders.mockResolvedValue(makeHeadersMap({ "x-forwarded-for": "192.168.1.1" }));

    const agreement = makePolicyAgreement({ id: "agreement_1", userId: "student_1" });
    mockDb.policyAgreement.create.mockResolvedValue(agreement);

    const result = await acceptPolicy();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("agreement_1");
    }

    expect(mockDb.policyAgreement.create).toHaveBeenCalledWith({
      data: {
        userId: session.user.id,
        ipAddress: "192.168.1.1",
      },
    });
  });

  it("returns Unauthorized when there is no active session", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await acceptPolicy();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/ไม่มีสิทธิ์/);
    }

    expect(mockDb.policyAgreement.create).not.toHaveBeenCalled();
  });

  it("reads the IP from x-forwarded-for and stores it in the record", async () => {
    const session = makeStudentSession({ id: "student_2" });
    mockAuth.mockResolvedValue(session);
    mockHeaders.mockResolvedValue(makeHeadersMap({ "x-forwarded-for": "10.0.0.5, 172.16.0.1" }));
    mockDb.policyAgreement.create.mockResolvedValue(
      makePolicyAgreement({ userId: "student_2", ipAddress: "10.0.0.5" })
    );

    await acceptPolicy();

    // The action should take only the first IP from the x-forwarded-for chain
    expect(mockDb.policyAgreement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ipAddress: "10.0.0.5" }) })
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    const session = makeStudentSession({ id: "student_3" });
    mockAuth.mockResolvedValue(session);
    mockHeaders.mockResolvedValue(makeHeadersMap({ "x-real-ip": "203.0.113.5" }));
    mockDb.policyAgreement.create.mockResolvedValue(
      makePolicyAgreement({ userId: "student_3", ipAddress: "203.0.113.5" })
    );

    await acceptPolicy();

    expect(mockDb.policyAgreement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ipAddress: "203.0.113.5" }) })
    );
  });

  it("stores 'unknown' when no IP header is present", async () => {
    const session = makeStudentSession({ id: "student_4" });
    mockAuth.mockResolvedValue(session);
    mockHeaders.mockResolvedValue(makeHeadersMap({}));
    mockDb.policyAgreement.create.mockResolvedValue(
      makePolicyAgreement({ userId: "student_4", ipAddress: "unknown" })
    );

    await acceptPolicy();

    expect(mockDb.policyAgreement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ipAddress: "unknown" }) })
    );
  });
});

// ---------------------------------------------------------------------------
// checkPolicyAgreement()
// ---------------------------------------------------------------------------

describe("checkPolicyAgreement()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("returns true when a policy agreement record exists for the session user", async () => {
    const session = makeStudentSession({ id: "student_3" });
    mockAuth.mockResolvedValue(session);
    mockDb.policyAgreement.findFirst.mockResolvedValue(
      makePolicyAgreement({ userId: "student_3" })
    );

    const result = await checkPolicyAgreement();

    expect(result).toBe(true);
  });

  it("returns false when no policy agreement record exists", async () => {
    const session = makeStudentSession({ id: "student_4" });
    mockAuth.mockResolvedValue(session);
    mockDb.policyAgreement.findFirst.mockResolvedValue(null);

    const result = await checkPolicyAgreement();

    expect(result).toBe(false);
  });

  it("returns false when no session is present", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await checkPolicyAgreement();

    expect(result).toBe(false);
    expect(mockDb.policyAgreement.findFirst).not.toHaveBeenCalled();
  });
});
