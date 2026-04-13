"use server";

import { db } from "@/lib/db";
import {
  EMAIL_VERIFICATION_MAX_ATTEMPTS,
  EMAIL_VERIFICATION_RATE_LIMIT_WINDOW_MS,
} from "@/lib/constants";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Actions (legacy — kept for backward compatibility with link-based flow)
// -----------------------------------------------------------------------

/**
 * Consume a verification token and mark the associated User as verified.
 * Legacy flow only (existing User records). The new registration flow uses
 * OTP-based verification via otp.actions.ts.
 *
 * The token is deleted after successful verification (single-use).
 * Rate limited: max 5 attempts per 5 minutes per user.
 */
export async function verifyEmail(
  token: string
): Promise<ActionResult<undefined>> {
  // Basic format guard — 64 hex chars
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return { success: false, error: "ลิงก์ไม่ถูกต้อง" };
  }

  const txResult = await db.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { token },
      include: {
        user: { select: { id: true, emailVerified: true } },
      },
    });

    if (!record || !record.userId) {
      return { type: "not_found" as const };
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
      return { type: "rate_limited" as const };
    }

    if (record.expiresAt < new Date()) {
      // Record failed attempt
      await tx.verificationAttempt.create({
        data: { userId: record.userId, success: false },
      });
      return { type: "expired" as const };
    }

    // Mark user as verified and delete token
    await Promise.all([
      tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      tx.emailVerificationToken.delete({ where: { token } }),
    ]);

    return { type: "success" as const };
  });

  switch (txResult.type) {
    case "not_found":
      return { success: false, error: "ลิงก์ไม่ถูกต้องหรือถูกใช้ไปแล้ว" };
    case "rate_limited":
      return { success: false, error: "พยายามมากเกินไป กรุณาลองใหม่ใน 5 นาที" };
    case "expired":
      return { success: false, error: "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่" };
    case "success":
      return { success: true, data: undefined };
  }
}
