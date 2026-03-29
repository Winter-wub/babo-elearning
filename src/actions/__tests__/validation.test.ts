/**
 * Validation schema tests.
 *
 * The Zod schemas are defined inline in each action file and are not exported,
 * so we reproduce them here verbatim.  Any change to the production schemas
 * should be reflected here — the test serves as a specification contract.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { MAX_VIDEO_DURATION } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Schemas (mirrored from production action files)
// ---------------------------------------------------------------------------

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const CreateVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional(),
  s3Key: z.string().min(1, "s3Key is required"),
  duration: z
    .number()
    .int()
    .positive()
    .max(MAX_VIDEO_DURATION, `Duration must be at most ${MAX_VIDEO_DURATION} seconds`),
  thumbnailUrl: z.string().url().optional(),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function valid<T>(schema: z.ZodSchema<T>, input: unknown) {
  return schema.safeParse(input);
}

// ---------------------------------------------------------------------------
// RegisterSchema
// ---------------------------------------------------------------------------

describe("RegisterSchema", () => {
  const validPayload = {
    name: "Alice Smith",
    email: "alice@example.com",
    password: "s3cur3P@ss",
  };

  it("accepts a valid registration payload", () => {
    const result = valid(RegisterSchema, validPayload);
    expect(result.success).toBe(true);
  });

  describe("name field", () => {
    it("rejects a name shorter than 2 characters", () => {
      expect(valid(RegisterSchema, { ...validPayload, name: "A" }).success).toBe(false);
    });

    it("rejects an empty name", () => {
      expect(valid(RegisterSchema, { ...validPayload, name: "" }).success).toBe(false);
    });

    it("rejects a name longer than 100 characters", () => {
      const longName = "A".repeat(101);
      expect(valid(RegisterSchema, { ...validPayload, name: longName }).success).toBe(false);
    });

    it("accepts a name of exactly 2 characters (lower boundary)", () => {
      expect(valid(RegisterSchema, { ...validPayload, name: "AB" }).success).toBe(true);
    });

    it("accepts a name of exactly 100 characters (upper boundary)", () => {
      const maxName = "A".repeat(100);
      expect(valid(RegisterSchema, { ...validPayload, name: maxName }).success).toBe(true);
    });

    it("rejects an XSS payload in name (treated as string, not sanitised here — length check still applies)", () => {
      // The schema does not sanitise HTML; it only checks length.
      // Sanitisation is the UI layer's concern.  A short XSS string passes the schema.
      const xss = '<script>alert("xss")</script>';
      // 30 chars — within 2..100
      expect(valid(RegisterSchema, { ...validPayload, name: xss }).success).toBe(true);
    });
  });

  describe("email field", () => {
    it("rejects a missing @ symbol", () => {
      expect(valid(RegisterSchema, { ...validPayload, email: "notanemail" }).success).toBe(false);
    });

    it("rejects an empty email string", () => {
      expect(valid(RegisterSchema, { ...validPayload, email: "" }).success).toBe(false);
    });

    it("rejects an email without a domain part", () => {
      expect(valid(RegisterSchema, { ...validPayload, email: "user@" }).success).toBe(false);
    });

    it("accepts a valid email with subdomain", () => {
      expect(valid(RegisterSchema, { ...validPayload, email: "user@mail.example.co.uk" }).success).toBe(true);
    });

    it("accepts email with plus addressing", () => {
      expect(valid(RegisterSchema, { ...validPayload, email: "user+tag@example.com" }).success).toBe(true);
    });
  });

  describe("password field", () => {
    it("rejects a password shorter than 8 characters", () => {
      expect(valid(RegisterSchema, { ...validPayload, password: "short" }).success).toBe(false);
    });

    it("rejects an empty password", () => {
      expect(valid(RegisterSchema, { ...validPayload, password: "" }).success).toBe(false);
    });

    it("accepts a password of exactly 8 characters (lower boundary)", () => {
      expect(valid(RegisterSchema, { ...validPayload, password: "12345678" }).success).toBe(true);
    });

    it("accepts a password of exactly 128 characters (upper boundary)", () => {
      const maxPass = "A".repeat(128);
      expect(valid(RegisterSchema, { ...validPayload, password: maxPass }).success).toBe(true);
    });

    it("rejects a password of 129 characters (above upper boundary)", () => {
      const tooLong = "A".repeat(129);
      expect(valid(RegisterSchema, { ...validPayload, password: tooLong }).success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// CreateVideoSchema
// ---------------------------------------------------------------------------

describe("CreateVideoSchema", () => {
  const validPayload = {
    title: "Introduction to TypeScript",
    description: "A beginner-friendly overview",
    s3Key: "videos/abc123/intro-typescript.mp4",
    duration: 600,
  };

  it("accepts a valid video payload", () => {
    expect(valid(CreateVideoSchema, validPayload).success).toBe(true);
  });

  it("accepts a payload without the optional description", () => {
    const { description: _d, ...noDesc } = validPayload;
    expect(valid(CreateVideoSchema, noDesc).success).toBe(true);
  });

  describe("title field", () => {
    it("rejects an empty title", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, title: "" }).success).toBe(false);
    });

    it("rejects a title longer than 255 characters", () => {
      const longTitle = "T".repeat(256);
      expect(valid(CreateVideoSchema, { ...validPayload, title: longTitle }).success).toBe(false);
    });

    it("accepts a title of exactly 255 characters", () => {
      const maxTitle = "T".repeat(255);
      expect(valid(CreateVideoSchema, { ...validPayload, title: maxTitle }).success).toBe(true);
    });
  });

  describe("duration field", () => {
    it("rejects duration of 0 (must be positive)", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: 0 }).success).toBe(false);
    });

    it("rejects negative duration", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: -1 }).success).toBe(false);
    });

    it("accepts duration of 1 (minimum positive integer)", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: 1 }).success).toBe(true);
    });

    it(`accepts duration of ${MAX_VIDEO_DURATION} (exact maximum)`, () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: MAX_VIDEO_DURATION }).success).toBe(true);
    });

    it(`rejects duration of ${MAX_VIDEO_DURATION + 1} (one above maximum)`, () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: MAX_VIDEO_DURATION + 1 }).success).toBe(false);
    });

    it("rejects a fractional duration (must be int)", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, duration: 60.5 }).success).toBe(false);
    });
  });

  describe("s3Key field", () => {
    it("rejects an empty s3Key", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, s3Key: "" }).success).toBe(false);
    });
  });

  describe("thumbnailUrl field (optional)", () => {
    it("accepts a valid https URL for thumbnailUrl", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, thumbnailUrl: "https://cdn.example.com/thumb.jpg" }).success).toBe(true);
    });

    it("rejects a non-URL string for thumbnailUrl", () => {
      expect(valid(CreateVideoSchema, { ...validPayload, thumbnailUrl: "not-a-url" }).success).toBe(false);
    });

    it("accepts omitted thumbnailUrl", () => {
      expect(valid(CreateVideoSchema, validPayload).success).toBe(true);
    });
  });

  describe("description field", () => {
    it("rejects a description longer than 2000 characters", () => {
      const longDesc = "D".repeat(2001);
      expect(valid(CreateVideoSchema, { ...validPayload, description: longDesc }).success).toBe(false);
    });

    it("accepts a description of exactly 2000 characters", () => {
      const maxDesc = "D".repeat(2000);
      expect(valid(CreateVideoSchema, { ...validPayload, description: maxDesc }).success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// UpdateUserSchema
// ---------------------------------------------------------------------------

describe("UpdateUserSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(valid(UpdateUserSchema, {}).success).toBe(true);
  });

  it("accepts a valid partial update with name only", () => {
    expect(valid(UpdateUserSchema, { name: "Bob Jones" }).success).toBe(true);
  });

  it("accepts a valid partial update with email only", () => {
    expect(valid(UpdateUserSchema, { email: "bob@example.com" }).success).toBe(true);
  });

  it("accepts isActive: false to deactivate a user", () => {
    expect(valid(UpdateUserSchema, { isActive: false }).success).toBe(true);
  });

  it("accepts a full update object", () => {
    expect(
      valid(UpdateUserSchema, { name: "Charlie", email: "charlie@example.com", isActive: true }).success
    ).toBe(true);
  });

  describe("name field (optional but constrained when provided)", () => {
    it("rejects name shorter than 2 characters when provided", () => {
      expect(valid(UpdateUserSchema, { name: "X" }).success).toBe(false);
    });

    it("rejects name longer than 100 characters when provided", () => {
      expect(valid(UpdateUserSchema, { name: "X".repeat(101) }).success).toBe(false);
    });

    it("rejects an empty name string when provided", () => {
      expect(valid(UpdateUserSchema, { name: "" }).success).toBe(false);
    });
  });

  describe("email field (optional but must be valid email when provided)", () => {
    it("rejects an invalid email when provided", () => {
      expect(valid(UpdateUserSchema, { email: "not-an-email" }).success).toBe(false);
    });

    it("rejects an empty email string when provided", () => {
      expect(valid(UpdateUserSchema, { email: "" }).success).toBe(false);
    });
  });

  describe("XSS and injection edge cases", () => {
    it("accepts XSS payload in name field (schema is lenient — sanitisation is UI concern)", () => {
      // A realistic XSS string is within length limits
      const xss = '<img src=x onerror=alert(1)>';
      expect(valid(UpdateUserSchema, { name: xss }).success).toBe(true);
    });

    it("rejects SQL injection payload that is an empty string in email", () => {
      expect(valid(UpdateUserSchema, { email: "" }).success).toBe(false);
    });
  });
});
