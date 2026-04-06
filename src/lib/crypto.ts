import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = "oauth-provider-config";

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return scryptSync(secret, SALT, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + auth tag + ciphertext.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a base64-encoded ciphertext produced by `encrypt()`.
 * Returns empty string on any failure (e.g. AUTH_SECRET rotation).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  try {
    const key = deriveKey();
    const buf = Buffer.from(ciphertext, "base64");
    if (buf.length < IV_LENGTH + TAG_LENGTH) return "";
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return "";
  }
}

/**
 * Mask a secret for display in admin UI.
 * Shows only the last 4 characters, replacing the rest with dots.
 */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return "•".repeat(value.length - 4) + value.slice(-4);
}
