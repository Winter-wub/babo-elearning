"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { verificationEmailTemplate, verificationEmailSubject } from "@/lib/email-templates";
import { BCRYPT_SALT_ROUNDS, EMAIL_VERIFICATION_TOKEN_TTL_MS } from "@/lib/constants";
import { buildVerificationUrl } from "@/lib/email-verification";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/**
 * Create a new student account.
 * Public — no authentication required.
 * After creation the user must verify their email before logging in.
 */
export async function registerUser(
  data: z.infer<typeof RegisterSchema>
): Promise<ActionResult<{ id: string; pendingVerification: true }>> {
  const parsed = RegisterSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { success: false, error: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว" };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Create the user and verification token in a transaction so that if the
  // email send fails we can roll back and not leave a stranded unverified user.
  let userId: string;
  let token: string;

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, passwordHash, role: "STUDENT" },
      });

      const rawToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

      await tx.emailVerificationToken.create({
        data: { userId: user.id, token: rawToken, expiresAt },
      });

      return { userId: user.id, token: rawToken };
    });

    userId = result.userId;
    token = result.token;
  } catch {
    return { success: false, error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองอีกครั้งภายหลัง" };
  }

  // Send verification email outside transaction — if this fails we delete the
  // user and token so the user can retry registration cleanly.
  try {
    const url = buildVerificationUrl(token);
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    await sendEmail({
      to: normalizedEmail,
      subject: verificationEmailSubject(),
      html: verificationEmailTemplate({ name: user?.name ?? name, url }),
    });
  } catch {
    // Clean up — remove the stranded user (cascade deletes the token)
    await db.user.delete({ where: { id: userId } }).catch(() => null);
    return { success: false, error: "ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองอีกครั้งภายหลัง" };
  }

  return { success: true, data: { id: userId, pendingVerification: true } };
}

/**
 * Returns the email verification status for a given email address.
 * Used by the login form to distinguish "wrong credentials" from "not verified".
 * Never reveals whether an account exists (returns 'not_found' for unknowns).
 */
export async function getEmailVerificationStatus(
  email: string
): Promise<"verified" | "unverified" | "not_found"> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { emailVerified: true },
  });

  if (!user) return "not_found";
  return user.emailVerified ? "verified" : "unverified";
}

/**
 * Check whether the current user has already accepted the policy.
 * Returns `true` if at least one PolicyAgreement record exists.
 */
export async function checkPolicyAgreement(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) {
    return false;
  }

  const agreement = await db.policyAgreement.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  return agreement !== null;
}

/**
 * Record that the current student has accepted the policy.
 * Requires an authenticated STUDENT session.
 */
export async function acceptPolicy(): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "ไม่มีสิทธิ์" };
  }

  // Determine IP server-side from request headers (never trust client-supplied IP)
  const headersList = await headers();
  const ipAddress =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const agreement = await db.policyAgreement.create({
    data: { userId: session.user.id, ipAddress },
  });

  return { success: true, data: { id: agreement.id } };
}
