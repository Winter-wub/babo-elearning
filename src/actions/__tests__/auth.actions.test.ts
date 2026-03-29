/**
 * Integration-style tests for auth server actions.
 *
 * External dependencies (Prisma, bcryptjs, next-auth) are all mocked so
 * these tests run without a database or auth server.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeUser, makePolicyAgreement, makeAdminSession, makeStudentSession, resetFactoryCounters } from "@/__tests__/helpers";

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
    },
    policyAgreement: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock: bcryptjs
// ---------------------------------------------------------------------------

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$12$mockedHashedPassword"),
    compare: vi.fn(),
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

import { registerUser, acceptPolicy, checkPolicyAgreement } from "@/actions/auth.actions";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";

const mockDb = vi.mocked(db);
const mockAuth = vi.mocked(auth);
const mockBcrypt = vi.mocked(bcrypt);
const mockHeaders = vi.mocked(headers);

/** Returns a mock ReadonlyHeaders-like object for the given header map. */
function makeHeadersMap(entries: Record<string, string> = {}) {
  return {
    get: (key: string) => entries[key.toLowerCase()] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("registerUser()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it("creates a new student account and returns the user id on success", async () => {
    const newUser = makeUser({ id: "new_user_1", email: "alice@example.com" });

    mockDb.user.findUnique.mockResolvedValue(null); // email not taken
    mockDb.user.create.mockResolvedValue(newUser);

    const result = await registerUser({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "securePass1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("new_user_1");
    }

    // Ensure bcrypt was called to hash the password
    expect(mockBcrypt.hash).toHaveBeenCalledWith("securePass1", expect.any(Number));

    // Ensure the user was created with the STUDENT role
    expect(mockDb.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "STUDENT" }),
      })
    );
  });

  it("returns an error when the email is already registered", async () => {
    const existingUser = makeUser({ email: "alice@example.com" });
    mockDb.user.findUnique.mockResolvedValue(existingUser);

    const result = await registerUser({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "securePass1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already exists/i);
    }

    // Should never attempt to create a user
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("returns a validation error when name is too short", async () => {
    const result = await registerUser({
      name: "A", // min 2 chars
      email: "alice@example.com",
      password: "securePass1",
    });

    expect(result.success).toBe(false);
    // Database should never be queried for invalid input
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("returns a validation error when email is invalid", async () => {
    const result = await registerUser({
      name: "Alice Smith",
      email: "not-an-email",
      password: "securePass1",
    });

    expect(result.success).toBe(false);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a validation error when password is too short", async () => {
    const result = await registerUser({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "short", // min 8 chars
    });

    expect(result.success).toBe(false);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a validation error when password is too long", async () => {
    const result = await registerUser({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "A".repeat(129), // max 128 chars
    });

    expect(result.success).toBe(false);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("never stores the plain-text password in the database", async () => {
    const newUser = makeUser({ email: "bob@example.com" });
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue(newUser);

    await registerUser({
      name: "Bob Jones",
      email: "bob@example.com",
      password: "plainTextPass99",
    });

    const createCallArg = mockDb.user.create.mock.calls[0]?.[0];
    expect(createCallArg?.data).not.toHaveProperty("password");
    // passwordHash must not equal the plain-text password
    expect(createCallArg?.data?.passwordHash).not.toBe("plainTextPass99");
  });
});

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
      expect(result.error).toMatch(/unauthorized/i);
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
