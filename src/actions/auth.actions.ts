"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";

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
