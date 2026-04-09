"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { verificationEmailTemplate, verificationEmailSubject } from "@/lib/email-templates";
import {
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_S,
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";
import { buildVerificationUrl } from "@/lib/email-verification";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/**
 * Consume a verification token and mark the associated user's email as verified.
 * The token is deleted after successful verification (single-use).
 *
 * Rate limited: max 5 attempts per 5 minutes per user.
 */
export async function verifyEmail(
  token: string
): Promise<ActionResult<undefined>> {
  // Basic format guard — 64 hex chars
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return { success: false, error: "ลิงก์ไม่ถูกต้อง" };
  }

  // Use a transaction to prevent race conditions and check rate limiting atomically
  const result = await db.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, emailVerified: true } } },
    });

    if (!record) {
      return { success: false, error: "ลิงก์ไม่ถูกต้องหรือถูกใช้ไปแล้ว" };
    }

    // Rate limiting: check for recent failed attempts
    const recentFailedAttempts = await tx.verificationAttempt.count({
      where: {
        userId: record.userId,
        success: false,
        createdAt: { gte: new Date(Date.now() - EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS) },
      },
    });

    if (recentFailedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      return {
        success: false,
        error: "พยายามมากเกินไป กรุณาลองใหม่ใน 5 นาที"
      };
    }

    if (record.expiresAt < new Date()) {
      // Log expired token attempt
      console.warn(JSON.stringify({
        event: "email_verification_expired",
        userId: record.userId,
        timestamp: new Date().toISOString(),
      }));

      // Record failed attempt
      await tx.verificationAttempt.create({
        data: { userId: record.userId, success: false },
      });

      return { success: false, error: "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่" };
    }

    // Mark verified and delete token atomically
    await Promise.all([
      tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      tx.emailVerificationToken.delete({ where: { token } }),
    ]);

    return { success: true, data: undefined };
  });

  return result;
}

/**
 * Resend a verification email to the given address.
 *
 * Rate limited: max 1 resend per RESEND_COOLDOWN_S seconds.
 * Returns a generic success for unknown emails to prevent email enumeration.
 */
export async function resendVerificationEmail(
  email: string
): Promise<ActionResult<undefined>> {
  const emailSchema = z.string().email();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "กรุณากรอกอีเมลที่ถูกต้อง" };
  }

  const normalizedEmail = parsed.data.toLowerCase().trim();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, emailVerified: true },
  });

  // Return generic success for unknown emails — do NOT leak account existence.
  if (!user) {
    return { success: true, data: undefined };
  }

  // Already verified — noop (return generic success to avoid info leak)
  if (user.emailVerified) {
    return { success: true, data: undefined };
  }

  // Rate-limit check: look for an existing token created within the cooldown window
  const recentToken = await db.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - EMAIL_VERIFICATION_RESEND_COOLDOWN_S * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentToken) {
    const secondsRemaining = Math.ceil(
      (recentToken.createdAt.getTime() + EMAIL_VERIFICATION_RESEND_COOLDOWN_S * 1000 - Date.now()) / 1000
    );
    return {
      success: false,
      error: `กรุณารอ ${secondsRemaining} วินาทีก่อนขอส่งอีเมลอีกครั้ง`,
    };
  }

  // Delete any old tokens for this user, create a fresh one
  await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  await db.emailVerificationToken.create({
    data: { userId: user.id, token: rawToken, expiresAt },
  });

  // Send email — if this fails, the token still exists so the user can retry
  const url = buildVerificationUrl(rawToken);
  await sendEmail({
    to: normalizedEmail,
    subject: verificationEmailSubject(),
    html: verificationEmailTemplate({ name: user.name ?? "คุณ", url }),
  });

  return { success: true, data: undefined };
}
