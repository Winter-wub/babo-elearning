"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult, PaginatedResult, SafeUser, SafeUserWithPermissions } from "@/types";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const GetUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  role: z.enum(["STUDENT", "ADMIN"]).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "email", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["STUDENT", "ADMIN"]).default("STUDENT"),
});

// -----------------------------------------------------------------------
// Extended types
// -----------------------------------------------------------------------

export type SafeUserWithCount = SafeUser & { _count: { videoPermissions: number } };

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** Paginated user list with permission counts. ADMIN only. */
export async function getUsers(
  filters: z.input<typeof GetUsersSchema> = {}
): Promise<ActionResult<PaginatedResult<SafeUserWithCount>>> {
  try {
    await requireAdmin();
    const { page, pageSize, search, role, isActive, sortBy, sortOrder } =
      GetUsersSchema.parse(filters);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        omit: { passwordHash: true },
        include: { _count: { select: { videoPermissions: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: {
        items: users as SafeUserWithCount[],
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลผู้ใช้ได้" };
  }
}

/** Single user with their video permissions. ADMIN only. */
export async function getUserById(
  id: string
): Promise<ActionResult<SafeUserWithPermissions>> {
  try {
    await requireAdmin();

    const user = await db.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
      include: {
        videoPermissions: {
          include: { video: true },
          orderBy: { grantedAt: "desc" },
        },
      },
    });

    if (!user) return { success: false, error: "ไม่พบผู้ใช้" };

    return { success: true, data: user as unknown as SafeUserWithPermissions };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลผู้ใช้ได้" };
  }
}

/** Edit name, email, isActive. ADMIN only. Cannot change own role. */
export async function updateUser(
  id: string,
  data: z.infer<typeof UpdateUserSchema>
): Promise<ActionResult<SafeUser>> {
  try {
    const session = await requireAdmin();
    const parsed = UpdateUserSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    // Prevent admin from deactivating themselves
    if (session.user.id === id && parsed.data.isActive === false) {
      return { success: false, error: "ไม่สามารถปิดใช้งานบัญชีของตัวเองได้" };
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      omit: { passwordHash: true },
    });

    logAdminAction(session, "USER_UPDATE", "User", id, { name: parsed.data.name, email: parsed.data.email, isActive: parsed.data.isActive });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true, data: user as SafeUser };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตผู้ใช้ได้" };
  }
}

/**
 * Admin-only user creation. Allows setting role.
 * Unlike registerUser (public), this is restricted to ADMIN.
 */
export async function createUser(
  data: z.infer<typeof CreateUserSchema>
): Promise<ActionResult<SafeUser>> {
  try {
    const session = await requireAdmin();
    const parsed = CreateUserSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return { success: false, error: "มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว" };
    }

    // Lazily import bcrypt only when needed (keeps edge bundle lean)
    const bcrypt = await import("bcryptjs");
    const { BCRYPT_SALT_ROUNDS } = await import("@/lib/constants");
    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_SALT_ROUNDS);
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
      omit: { passwordHash: true },
    });

    logAdminAction(session, "USER_CREATE", "User", user.id, { email: parsed.data.email, role: parsed.data.role });
    revalidatePath("/admin/users");
    return { success: true, data: user as SafeUser };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างผู้ใช้ได้" };
  }
}

/** Soft-delete: set isActive=false. ADMIN only. Cannot delete self. */
export async function deleteUser(id: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();

    if (session.user.id === id) {
      return { success: false, error: "ไม่สามารถปิดใช้งานบัญชีของตัวเองได้" };
    }

    await db.user.update({ where: { id }, data: { isActive: false } });

    logAdminAction(session, "USER_DEACTIVATE", "User", id);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบผู้ใช้ได้" };
  }
}
