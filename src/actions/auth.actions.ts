"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";
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
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const user = await db.user.create({
    data: { name, email, passwordHash, role: "STUDENT" },
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
    return { success: false, error: "Unauthorized" };
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
