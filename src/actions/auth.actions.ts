"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import { getDeploymentTenantSlug, resolveTenantId } from "@/lib/tenant";
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
 */
export async function registerUser(
  data: z.infer<typeof RegisterSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = RegisterSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }

  const { name, email, password } = parsed.data;

  const tenantSlug = getDeploymentTenantSlug();

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    return { success: false, error: "Tenant not found" };
  }

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // If the user exists, check if they are already in this tenant
    const existingMember = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: existing.id,
        },
      },
    });

    if (existingMember) {
      return { success: false, error: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้วในระบบนี้" };
    }

    // Verify password matches before adding them to the new tenant
    if (!existing.passwordHash) {
      return { success: false, error: "อีเมลนี้ลงชื่อเข้าใช้ด้วยโซเชียลมีเดีย กรุณาเข้าสู่ระบบเพื่อทำรายการต่อ" };
    }

    const passwordValid = await bcrypt.compare(password, existing.passwordHash);
    if (!passwordValid) {
      return { success: false, error: "อีเมลนี้มีอยู่ในระบบแล้วแต่รหัสผ่านไม่ถูกต้อง" };
    }

    // Password is valid, add them to the new tenant
    await db.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: existing.id,
        role: "STUDENT",
      },
    });

    return { success: true, data: { id: existing.id } };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Use a transaction to create both user and tenant member
  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, passwordHash, role: "STUDENT" },
    });

    await tx.tenantMember.create({
      data: {
        tenantId: tenant.id,
        userId: newUser.id,
        role: "STUDENT",
      },
    });

    return newUser;
  });

  return { success: true, data: { id: user.id } };
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

  const tenantId = await resolveTenantId(session.user.activeTenantId);

  const agreement = await db.policyAgreement.findFirst({
    where: { userId: session.user.id, tenantId },
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

  const tenantId = await resolveTenantId(session.user.activeTenantId);

  const agreement = await db.policyAgreement.create({
    data: { userId: session.user.id, ipAddress, tenantId },
  });

  return { success: true, data: { id: agreement.id } };
}
