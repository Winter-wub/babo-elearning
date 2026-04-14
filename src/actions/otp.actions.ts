"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { otpEmailTemplate, otpEmailSubject } from "@/lib/email-templates";
import {
  BCRYPT_SALT_ROUNDS,
  OTP_LENGTH,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_SESSION_TTL_MS,
} from "@/lib/constants";
import { reconstructTimeConfig, resolveTimeFields } from "@/lib/permission-utils";
import { getInviteLinkStatus } from "@/lib/invite-utils";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const EmailSchema = z.object({
  email: z.string().email(),
  inviteCode: z.string().optional(),
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(OTP_LENGTH),
});

const CompleteRegistrationSchema = z.object({
  sessionToken: z.string().min(1),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/** Generate a zero-padded 6-digit OTP using crypto.randomInt. */
function generateOtp(): string {
  const max = Math.pow(10, OTP_LENGTH); // 1_000_000
  return randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
}

// -----------------------------------------------------------------------
// Action 1: Request OTP
// -----------------------------------------------------------------------

/**
 * Start step 1 of registration: validate email, generate OTP, send via email.
 * Creates (or replaces) a PendingRegistration record.
 * Public — no authentication required.
 */
export async function requestOtp(
  data: z.infer<typeof EmailSchema>
): Promise<ActionResult<undefined>> {
  const parsed = EmailSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "กรุณากรอกอีเมลที่ถูกต้อง" };
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const inviteCode = parsed.data.inviteCode || null;

  // Check for existing verified User — block registration
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    return { success: false, error: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว" };
  }

  // Check for existing pending registration — enforce resend cooldown
  const existingPending = await db.pendingRegistration.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingPending) {
    const elapsed = Date.now() - existingPending.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const secondsRemaining = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsed) / 1000
      );
      return {
        success: false,
        error: `กรุณารอ ${secondsRemaining} วินาทีก่อนขอรหัสใหม่`,
      };
    }
    // Delete stale pending record
    await db.pendingRegistration.delete({ where: { id: existingPending.id } });
  }

  // Generate and hash OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Create new PendingRegistration
  try {
    await db.pendingRegistration.create({
      data: {
        email: normalizedEmail,
        otpHash,
        otpExpiresAt,
        attempts: 0,
        verified: false,
        inviteCode,
      },
    });
  } catch {
    return {
      success: false,
      error: "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้งภายหลัง",
    };
  }

  // Send OTP email
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: otpEmailSubject(),
      html: otpEmailTemplate({ otp }),
    });
  } catch {
    // Clean up stranded pending registration
    await db.pendingRegistration
      .delete({ where: { email: normalizedEmail } })
      .catch(() => null);
    return {
      success: false,
      error: "ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองอีกครั้งภายหลัง",
    };
  }

  return { success: true, data: undefined };
}

// -----------------------------------------------------------------------
// Action 2: Verify OTP
// -----------------------------------------------------------------------

/**
 * Step 2: verify the 6-digit OTP for the given email.
 * On success, marks PendingRegistration as verified and returns a sessionToken
 * that authorises step 3 (completeRegistration).
 */
export async function verifyOtp(
  data: z.infer<typeof VerifyOtpSchema>
): Promise<ActionResult<{ sessionToken: string }>> {
  const parsed = VerifyOtpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "กรุณากรอกรหัส OTP ที่ถูกต้อง" };
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const { otp } = parsed.data;

  const pending = await db.pendingRegistration.findUnique({
    where: { email: normalizedEmail },
  });

  if (!pending) {
    return { success: false, error: "ไม่พบข้อมูลการลงทะเบียน กรุณาเริ่มใหม่" };
  }

  // Rate limit check
  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      success: false,
      error: "พยายามมากเกินไป กรุณาขอรหัสใหม่",
    };
  }

  // Expiry check
  if (pending.otpExpiresAt < new Date()) {
    return {
      success: false,
      error: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
    };
  }

  // Increment attempts first (regardless of match result)
  await db.pendingRegistration.update({
    where: { id: pending.id },
    data: { attempts: { increment: 1 } },
  });

  // Compare OTP
  const isMatch = await bcrypt.compare(otp, pending.otpHash);
  if (!isMatch) {
    const remaining = OTP_MAX_ATTEMPTS - (pending.attempts + 1);
    return {
      success: false,
      error:
        remaining > 0
          ? `รหัส OTP ไม่ถูกต้อง เหลือ ${remaining} ครั้ง`
          : "พยายามมากเกินไป กรุณาขอรหัสใหม่",
    };
  }

  // OTP matches — generate session token, mark as verified
  const sessionToken = randomBytes(32).toString("hex");

  await db.pendingRegistration.update({
    where: { id: pending.id },
    data: { verified: true, sessionToken },
  });

  return { success: true, data: { sessionToken } };
}

// -----------------------------------------------------------------------
// Action 3: Complete Registration
// -----------------------------------------------------------------------

/**
 * Step 3: create the User record after OTP verification.
 * Requires the sessionToken returned by verifyOtp.
 */
export async function completeRegistration(
  data: z.infer<typeof CompleteRegistrationSchema>
): Promise<ActionResult<undefined>> {
  const parsed = CompleteRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { sessionToken, name, password } = parsed.data;

  const pending = await db.pendingRegistration.findUnique({
    where: { sessionToken },
  });

  if (!pending || !pending.verified) {
    return { success: false, error: "เซสชันไม่ถูกต้อง กรุณาเริ่มลงทะเบียนใหม่" };
  }

  // Check session not expired (generous 1-hour window for step 3)
  const sessionAge = Date.now() - pending.createdAt.getTime();
  if (sessionAge > OTP_SESSION_TTL_MS) {
    // Clean up expired pending registration
    await db.pendingRegistration.delete({ where: { id: pending.id } });
    return {
      success: false,
      error: "เซสชันหมดอายุแล้ว กรุณาเริ่มลงทะเบียนใหม่",
    };
  }

  // Double-check no User was created in the meantime (race condition guard)
  const existingUser = await db.user.findUnique({
    where: { email: pending.email },
  });
  if (existingUser) {
    await db.pendingRegistration.delete({ where: { id: pending.id } });
    return { success: false, error: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว" };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  try {
    await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: pending.email,
          passwordHash,
          name,
          role: "STUDENT",
          emailVerified: new Date(),
        },
      });

      await tx.pendingRegistration.delete({ where: { id: pending.id } });

      // --- Invite link auto-grant ---
      if (pending.inviteCode) {
        const invite = await tx.inviteLink.findUnique({
          where: { code: pending.inviteCode },
        });

        if (invite) {
          const now = new Date();
          const status = getInviteLinkStatus(invite, now);

          if (status === "active") {
            // Atomically increment redemptions with a conditional check
            const updated = await tx.inviteLink.updateMany({
              where: {
                id: invite.id,
                isRevoked: false,
                OR: [
                  { maxRedemptions: null },
                  { currentRedemptions: { lt: invite.maxRedemptions ?? 0 } },
                ],
              },
              data: { currentRedemptions: { increment: 1 } },
            });

            if (updated.count > 0) {
              // Filter to only active videos
              const activeVideos = await tx.video.findMany({
                where: { id: { in: invite.videoIds }, isActive: true },
                select: { id: true },
              });

              if (activeVideos.length > 0) {
                const timeConfig = reconstructTimeConfig(invite);
                const timeFields = resolveTimeFields(timeConfig, now);

                await tx.videoPermission.createMany({
                  data: activeVideos.map((v) => ({
                    userId: newUser.id,
                    videoId: v.id,
                    grantedBy: invite.createdBy,
                    grantedAt: now,
                    ...timeFields,
                  })),
                  skipDuplicates: true,
                });
              }

              await tx.inviteLinkRedemption.create({
                data: {
                  inviteLinkId: invite.id,
                  userId: newUser.id,
                },
              });
            }
          }
        }
      }
    });
  } catch {
    return {
      success: false,
      error: "ไม่สามารถสร้างบัญชีได้ กรุณาลองอีกครั้งภายหลัง",
    };
  }

  return { success: true, data: undefined };
}
