import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt, maskSecret } from "@/lib/crypto";

describe("crypto", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, AUTH_SECRET: "test-secret-for-unit-tests-32chars!" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("encrypt / decrypt round-trip", () => {
    it("round-trips a normal string", () => {
      const plaintext = "my-oauth-client-secret-12345";
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("round-trips unicode content", () => {
      const plaintext = "ทดสอบภาษาไทย-🔑";
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("returns empty string for empty input (encrypt)", () => {
      expect(encrypt("")).toBe("");
    });

    it("returns empty string for empty input (decrypt)", () => {
      expect(decrypt("")).toBe("");
    });
  });

  describe("decrypt failure handling", () => {
    it("returns empty string for tampered ciphertext", () => {
      const encrypted = encrypt("secret-value");
      const tampered = encrypted.slice(0, -4) + "XXXX";
      expect(decrypt(tampered)).toBe("");
    });

    it("returns empty string for garbage input", () => {
      expect(decrypt("not-valid-base64!!!")).toBe("");
    });

    it("returns empty string for too-short input", () => {
      expect(decrypt("AQID")).toBe(""); // only 3 bytes
    });

    it("returns empty string when AUTH_SECRET differs", () => {
      const encrypted = encrypt("secret-value");
      process.env.AUTH_SECRET = "different-secret-for-rotation-test!";
      expect(decrypt(encrypted)).toBe("");
    });
  });

  describe("maskSecret", () => {
    it("masks a normal-length secret", () => {
      const result = maskSecret("abcdefghij");
      expect(result).toBe("••••••ghij");
    });

    it("returns dots for short secrets (4 chars or less)", () => {
      expect(maskSecret("abc")).toBe("••••");
      expect(maskSecret("abcd")).toBe("••••");
    });

    it("returns empty string for empty input", () => {
      expect(maskSecret("")).toBe("");
    });

    it("shows last 4 chars for 5-char secret", () => {
      expect(maskSecret("12345")).toBe("•2345");
    });
  });
});
