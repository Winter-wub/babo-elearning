"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  passwordResetEmailTemplate,
  passwordResetEmailSubject,
  passwordChangedEmailTemplate,
  passwordChangedEmailSubject,
} from "@/lib/email-templates";
import {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_MS,
  PASSWORD_RESET_MAX_PER_HOUR,
} from "@/lib/constants";
import { logAudit, logAdminAction } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const RequestResetSchema = z.object({
  email: z.string().email(),
});

const TokenSchema = z.string().regex(/^[a-f0-9]{64}$/);

const ResetPasswordSchema = z.object({
  token: TokenSchema,
  password: z
    .string()
    .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    .max(128, "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร")
    .regex(/[a-zA-Z]/, "รหัสผ่านต้องมีตัวอักษรอย่างน้อย 1 ตัว")
    .regex(/\d/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
});

const AdminResetSchema = z.object({
  userId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
}

// Token is placed in the URL *fragment* (after `#`). Fragments never reach
// the server, so they are absent from access logs, Referer headers, and
// webserver analytics — closing the leak paths that `/reset-password/[token]`
// would have opened.
function buildResetUrl(rawToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/reset-password#t=${rawToken}`;
}

async function sendResetLink(
  to: string,
  displayName: string,
  rawToken: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: passwordResetEmailSubject(),
    html: passwordResetEmailTemplate({
      name: displayName,
      url: buildResetUrl(rawToken),
    }),
  });
}

// ---------------------------------------------------------------------------
// requestPasswordReset — public (self-service "forgot password")
//
// Always returns { success: true } to avoid revealing whether an account
// exists. Silently enforces a per-user rate limit, silently skips inactive
// accounts and users without a passwordHash (social-only logins), and
// dispatches the email send fire-and-forget so response timing does not
// differentiate "known email" vs "unknown email".
// ---------------------------------------------------------------------------

export async function requestPasswordReset(input: {
  email: string;
}): Promise<{ success: boolean }> {
  try {
    const parsed = RequestResetSchema.safeParse(input);
    if (!parsed.success) return { success: true };

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user || !user.isActive || !user.passwordHash) {
      return { success: true };
    }

    const recentSelfServiceCount = await db.passwordResetToken.count({
      where: {
        userId: user.id,
        requestedByAdminId: null,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (recentSelfServiceCount >= PASSWORD_RESET_MAX_PER_HOUR) {
      return { success: true };
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Fire-and-forget email send so known/unknown branches have similar
    // wall-clock latency (mitigates timing-based user enumeration).
    sendResetLink(user.email, user.name ?? user.email, rawToken).catch((err) => {
      console.error("[password-reset] sendResetLink failed:", err);
    });
  } catch (err) {
    console.error("[password-reset] requestPasswordReset failed:", err);
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// validateResetToken — public
//
// Returns only { valid: boolean } — never leaks the account email, even to a
// caller holding a valid token.
// ---------------------------------------------------------------------------

export async function validateResetToken(
  token: string,
): Promise<{ valid: boolean }> {
  const parsed = TokenSchema.safeParse(token);
  if (!parsed.success) return { valid: false };

  const tokenHash = hashToken(parsed.data);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      consumedAt: true,
      expiresAt: true,
      user: { select: { isActive: true } },
    },
  });

  if (
    !record ||
    record.consumedAt ||
    record.expiresAt < new Date() ||
    !record.user.isActive
  ) {
    return { valid: false };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// resetPassword — public (consumes a token, sets new password)
//
// Single-use enforcement is atomic: the consume-update is a conditional
// updateMany that only succeeds when the row is still unconsumed AND
// unexpired. Two concurrent callers racing the same token will see exactly
// one `count: 1` and one `count: 0`, so only one reset proceeds.
//
// On success: bumps User.tokenVersion so all existing JWT sessions are
// invalidated on the next server-side render (edge middleware keeps the
// stale JWT until it naturally expires — see auth.ts for the full
// threat-model note). Sibling tokens are left untouched; they will simply
// fail the `consumedAt IS NULL` gate on subsequent use and expire on their
// own schedule.
// ---------------------------------------------------------------------------

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
    };
  }

  const tokenHash = hashToken(parsed.data.token);
  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_SALT_ROUNDS);
  const now = new Date();

  let notifyEmail: string | null = null;
  let notifyName: string | null = null;
  let consumedUserId: string | null = null;
  let consumedTokenId: string | null = null;
  let consumedByAdminId: string | null = null;

  try {
    await db.$transaction(async (tx) => {
      // Atomic consume: only one caller can flip consumedAt null→now.
      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          tokenHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new Error("TOKEN_INVALID");
      }

      const record = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          userId: true,
          requestedByAdminId: true,
          user: {
            select: { id: true, email: true, name: true, isActive: true },
          },
        },
      });

      if (!record || !record.user.isActive) {
        throw new Error("USER_DISABLED");
      }

      // Re-assert isActive inside the txn so a concurrent admin deactivate
      // doesn't resurrect a disabled account via a stale check.
      const updated = await tx.user.updateMany({
        where: { id: record.userId, isActive: true },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new Error("USER_DISABLED");
      }

      // Invalidate any other live reset tokens for this user so a duplicate
      // request in another tab/email cannot set a different password later.
      await tx.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      notifyEmail = record.user.email;
      notifyName = record.user.name ?? record.user.email;
      consumedUserId = record.userId;
      consumedTokenId = record.id;
      consumedByAdminId = record.requestedByAdminId;
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "TOKEN_INVALID" || code === "USER_DISABLED") {
      return {
        success: false,
        error: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว",
      };
    }
    console.error("[password-reset] resetPassword failed:", err);
    return {
      success: false,
      error: "ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาลองอีกครั้ง",
    };
  }

  if (notifyEmail && consumedUserId && consumedTokenId) {
    // Audit: record who actually completed the reset (and whether it was
    // admin-initiated) so the admin-triggered and self-service flows are
    // both auditable end-to-end.
    logAudit({
      userId: consumedUserId,
      userEmail: notifyEmail,
      action: "USER_PASSWORD_CHANGED_VIA_RESET",
      entityType: "User",
      entityId: consumedUserId,
      metadata: {
        tokenId: consumedTokenId,
        requestedByAdminId: consumedByAdminId,
      },
    });

    // Fire-and-forget security notification
    sendEmail({
      to: notifyEmail,
      subject: passwordChangedEmailSubject(),
      html: passwordChangedEmailTemplate({ name: notifyName ?? notifyEmail }),
    }).catch((err) => {
      console.error("[password-reset] confirmation email failed:", err);
    });
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// adminSendPasswordReset — admin-only
//
// Generates a reset token on behalf of a specific user and emails them the
// reset link. User completes the reset via the same /reset-password page.
// Every attempt (success OR failure) writes an audit log entry so a rogue
// admin probing for targets cannot operate silently.
// ---------------------------------------------------------------------------

export async function adminSendPasswordReset(input: {
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = AdminResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์" };
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  const failAudit = (reason: string, entityId?: string) => {
    logAdminAction(
      session,
      "USER_PASSWORD_RESET_REQUEST_FAILED",
      "User",
      entityId ?? parsed.data.userId,
      { reason },
    );
  };

  if (!user) {
    failAudit("not_found");
    return { success: false, error: "ไม่พบผู้ใช้" };
  }
  if (!user.isActive) {
    failAudit("inactive", user.id);
    return { success: false, error: "บัญชีนี้ถูกปิดใช้งาน" };
  }
  if (!user.passwordHash) {
    failAudit("social_only", user.id);
    return {
      success: false,
      error: "บัญชีนี้ใช้การเข้าสู่ระบบแบบโซเชียล ไม่มีรหัสผ่านให้รีเซ็ต",
    };
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  let tokenId: string;
  try {
    const created = await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedByAdminId: session.user.id,
      },
      select: { id: true },
    });
    tokenId = created.id;
  } catch (err) {
    console.error("[password-reset] adminSendPasswordReset create failed:", err);
    failAudit("token_create_error", user.id);
    return {
      success: false,
      error: "ไม่สามารถส่งลิงก์รีเซ็ตได้ กรุณาลองอีกครั้ง",
    };
  }

  try {
    await sendResetLink(user.email, user.name ?? user.email, rawToken);
  } catch (err) {
    console.error("[password-reset] adminSendPasswordReset send failed:", err);
    // Best-effort cleanup: mark the orphan token consumed so it cannot be
    // used by anyone who happens to have observed the raw token during the
    // failed send. 1h expiry also covers it, but this is explicit.
    await db.passwordResetToken
      .update({ where: { id: tokenId }, data: { consumedAt: new Date() } })
      .catch(() => {});
    failAudit("email_send_error", user.id);
    return {
      success: false,
      error: "ไม่สามารถส่งลิงก์รีเซ็ตได้ กรุณาลองอีกครั้ง",
    };
  }

  logAdminAction(session, "USER_PASSWORD_RESET_REQUESTED", "User", user.id, {
    targetEmail: user.email,
    targetRole: user.role,
    tokenId,
  });

  return { success: true };
}
