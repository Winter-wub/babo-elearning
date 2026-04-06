"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type { SafeUser } from "@/types";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

export type ProfileData = SafeUser & {
  totalVideosAccessed: number;
};

/** Get current user's profile. Never returns passwordHash. */
export async function getProfile(): Promise<ActionResult<ProfileData>> {
  try {
    const session = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, error: "ไม่พบผู้ใช้" };
    }

    const totalVideosAccessed = await db.videoPermission.count({
      where: { userId: user.id },
    });

    // Strip passwordHash — never expose to client
    const { passwordHash: _, ...safeUser } = user;

    return {
      success: true,
      data: {
        ...safeUser,
        totalVideosAccessed,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลโปรไฟล์ได้",
    };
  }
}

/** Update current user's name only. Email changes are not allowed. */
export async function updateProfile(data: {
  name: string;
}): Promise<ActionResult<SafeUser>> {
  try {
    const session = await requireAuth();

    const name = data.name.trim();
    if (!name || name.length < 1) {
      return { success: false, error: "จำเป็นต้องระบุชื่อ" };
    }
    if (name.length > 100) {
      return { success: false, error: "ชื่อต้องไม่เกิน 100 ตัวอักษร" };
    }

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    // Strip passwordHash
    const { passwordHash: _, ...safeUser } = updated;

    revalidatePath("/profile");
    return { success: true, data: safeUser };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตโปรไฟล์ได้",
    };
  }
}
