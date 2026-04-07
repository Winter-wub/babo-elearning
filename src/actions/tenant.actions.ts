"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/actions/helpers";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type TenantWithCounts = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  logoUrl: string | null;
  maxMembers: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { members: number; videos: number; playlists: number };
};

export type TenantDetail = TenantWithCounts & {
  _count: { members: number; videos: number; playlists: number; videoPermissions: number };
  owners: { id: string; name: string | null; email: string }[];
};

export type TenantMemberRow = {
  id: string;
  role: "OWNER" | "ADMIN" | "STUDENT";
  createdAt: Date;
  user: { id: string; name: string | null; email: string; isActive: boolean };
};

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const slugRegex = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;

const GetTenantsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "slug", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(slugRegex, "Slug ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข และ - (3-63 ตัว, ขึ้นต้นด้วยตัวอักษร)"),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email().optional(),
  maxMembers: z.coerce.number().int().positive().optional(),
  ownerEmail: z.string().email().optional(),
});

const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  maxMembers: z.coerce.number().int().positive().optional().or(z.literal(0)),
  isActive: z.boolean().optional(),
});

const GetTenantMembersSchema = z.object({
  tenantId: z.string(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "STUDENT"]).optional(),
});

const AddTenantMemberSchema = z.object({
  tenantId: z.string(),
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "STUDENT"]).default("STUDENT"),
});

const UpdateMemberRoleSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "STUDENT"]),
});

// -----------------------------------------------------------------------
// Tenant CRUD
// -----------------------------------------------------------------------

/** Paginated tenant list with counts. SUPER_ADMIN only. */
export async function getTenants(
  filters: z.input<typeof GetTenantsSchema> = {}
): Promise<ActionResult<PaginatedResult<TenantWithCounts>>> {
  try {
    await requireSuperAdmin();
    const { page, pageSize, search, isActive, sortBy, sortOrder } =
      GetTenantsSchema.parse(filters);

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [total, tenants] = await Promise.all([
      db.tenant.count({ where }),
      db.tenant.findMany({
        where,
        include: { _count: { select: { members: true, videos: true, playlists: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: {
        items: tenants as TenantWithCounts[],
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเทแนนท์ได้" };
  }
}

/** Tenant summary stats. SUPER_ADMIN only. */
export async function getTenantStats(): Promise<
  ActionResult<{ total: number; active: number; suspended: number }>
> {
  try {
    await requireSuperAdmin();
    const [total, active] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { isActive: true } }),
    ]);
    return { success: true, data: { total, active, suspended: total - active } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสถิติได้" };
  }
}

/** Single tenant with counts and owner list. SUPER_ADMIN only. */
export async function getTenantById(id: string): Promise<ActionResult<TenantDetail>> {
  try {
    await requireSuperAdmin();

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, videos: true, playlists: true, videoPermissions: true } },
        members: {
          where: { role: "OWNER" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!tenant) return { success: false, error: "ไม่พบเทแนนท์" };

    return {
      success: true,
      data: { ...tenant, owners: tenant.members.map((m) => m.user) } as TenantDetail,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเทแนนท์ได้" };
  }
}

/** Check slug availability. SUPER_ADMIN only. */
export async function checkTenantSlugAvailable(slug: string): Promise<{ available: boolean }> {
  try {
    await requireSuperAdmin();
    if (!slugRegex.test(slug)) return { available: false };
    const existing = await db.tenant.findUnique({ where: { slug }, select: { id: true } });
    return { available: !existing };
  } catch {
    return { available: false };
  }
}

/** Create a new tenant with optional initial owner. SUPER_ADMIN only. */
export async function createTenant(
  input: z.input<typeof CreateTenantSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    await requireSuperAdmin();
    const parsed = CreateTenantSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const { name, slug, description, contactEmail, maxMembers, ownerEmail } = parsed.data;

    const existing = await db.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return { success: false, error: "Slug นี้ถูกใช้งานแล้ว" };

    const tenant = await db.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          description: description || null,
          contactEmail: contactEmail || null,
          maxMembers: maxMembers || null,
        },
      });

      if (ownerEmail) {
        const user = await tx.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
        if (user) {
          await tx.tenantMember.create({
            data: { tenantId: newTenant.id, userId: user.id, role: "OWNER" },
          });
        }
      }

      return newTenant;
    });

    revalidatePath("/admin/tenants");
    return { success: true, data: { id: tenant.id, slug: tenant.slug } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างเทแนนท์ได้" };
  }
}

/** Update tenant details. SUPER_ADMIN only. */
export async function updateTenant(
  id: string,
  input: z.input<typeof UpdateTenantSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    const parsed = UpdateTenantSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;
    if (parsed.data.contactEmail !== undefined) updateData.contactEmail = parsed.data.contactEmail || null;
    if (parsed.data.maxMembers !== undefined) updateData.maxMembers = parsed.data.maxMembers || null;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    await db.tenant.update({ where: { id }, data: updateData });

    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${id}`);
    return { success: true, data: { id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตเทแนนท์ได้" };
  }
}

/** Soft-delete: set isActive=false. SUPER_ADMIN only. */
export async function deleteTenant(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireSuperAdmin();
    await db.tenant.update({ where: { id }, data: { isActive: false } });

    revalidatePath("/admin/tenants");
    revalidatePath(`/admin/tenants/${id}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบเทแนนท์ได้" };
  }
}

// -----------------------------------------------------------------------
// Member management
// -----------------------------------------------------------------------

/** Paginated member list for a tenant. SUPER_ADMIN only. */
export async function getTenantMembers(
  filters: z.input<typeof GetTenantMembersSchema>
): Promise<ActionResult<PaginatedResult<TenantMemberRow>>> {
  try {
    await requireSuperAdmin();
    const { tenantId, page, pageSize, search, role } = GetTenantMembersSchema.parse(filters);

    const where = {
      tenantId,
      ...(role && { role }),
      ...(search && {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
    };

    const [total, members] = await Promise.all([
      db.tenantMember.count({ where }),
      db.tenantMember.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: {
        items: members as TenantMemberRow[],
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสมาชิกได้" };
  }
}

/** Add user to tenant by email. Enforces maxMembers. SUPER_ADMIN only. */
export async function addTenantMember(
  input: z.input<typeof AddTenantMemberSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSuperAdmin();
    const parsed = AddTenantMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const { tenantId, email, role } = parsed.data;

    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return { success: false, error: "ไม่พบผู้ใช้ที่มีอีเมลนี้" };

    // Check maxMembers limit
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { maxMembers: true } });
    if (tenant?.maxMembers) {
      const currentCount = await db.tenantMember.count({ where: { tenantId } });
      if (currentCount >= tenant.maxMembers) {
        return { success: false, error: `จำนวนสมาชิกเต็มแล้ว (สูงสุด ${tenant.maxMembers} คน)` };
      }
    }

    const member = await db.tenantMember.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: { role },
      create: { tenantId, userId: user.id, role },
      select: { id: true },
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true, data: { id: member.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเพิ่มสมาชิกได้" };
  }
}

/** Update member role. Last-OWNER protection. SUPER_ADMIN only. */
export async function updateTenantMemberRole(
  input: z.input<typeof UpdateMemberRoleSchema>
): Promise<ActionResult<undefined>> {
  try {
    await requireSuperAdmin();
    const parsed = UpdateMemberRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const { tenantId, userId, role: newRole } = parsed.data;

    const current = await db.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!current) return { success: false, error: "ไม่พบสมาชิก" };

    // Last-OWNER protection
    if (current.role === "OWNER" && newRole !== "OWNER") {
      const ownerCount = await db.tenantMember.count({ where: { tenantId, role: "OWNER" } });
      if (ownerCount <= 1) {
        return { success: false, error: "ไม่สามารถเปลี่ยนบทบาท Owner คนสุดท้ายได้" };
      }
    }

    await db.tenantMember.update({
      where: { tenantId_userId: { tenantId, userId } },
      data: { role: newRole },
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเปลี่ยนบทบาทได้" };
  }
}

/** Remove member from tenant. Last-OWNER protection. Cleans up VideoPermissions. SUPER_ADMIN only. */
export async function removeTenantMember(
  tenantId: string,
  userId: string
): Promise<ActionResult<undefined>> {
  try {
    await requireSuperAdmin();

    const member = await db.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!member) return { success: false, error: "ไม่พบสมาชิก" };

    // Last-OWNER protection
    if (member.role === "OWNER") {
      const ownerCount = await db.tenantMember.count({ where: { tenantId, role: "OWNER" } });
      if (ownerCount <= 1) {
        return { success: false, error: "ไม่สามารถลบ Owner คนสุดท้ายได้" };
      }
    }

    // Remove member and their video permissions for this tenant
    await db.$transaction([
      db.tenantMember.delete({ where: { tenantId_userId: { tenantId, userId } } }),
      db.videoPermission.deleteMany({ where: { tenantId, userId } }),
    ]);

    revalidatePath(`/admin/tenants/${tenantId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบสมาชิกได้" };
  }
}

// -----------------------------------------------------------------------
// Tenant context switching (SUPER_ADMIN only)
// -----------------------------------------------------------------------

/** Minimal tenant list for the context switcher dropdown. SUPER_ADMIN only. */
export async function getAllTenantsForSwitcher(): Promise<
  ActionResult<{ id: string; name: string; slug: string }[]>
> {
  try {
    await requireSuperAdmin();
    const tenants = await db.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: tenants };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลเทแนนท์ได้" };
  }
}

/**
 * Validate and prepare a tenant context switch.
 * Returns the tenantId and the SUPER_ADMIN's TenantMember role (if any)
 * so the client can call session.update() with the correct values.
 */
export async function switchTenantContext(
  tenantId: string
): Promise<ActionResult<{ tenantId: string; tenantRole: string | null }>> {
  try {
    const { session } = await requireSuperAdmin();

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, isActive: true },
    });
    if (!tenant) return { success: false, error: "ไม่พบเทแนนท์" };
    if (!tenant.isActive) return { success: false, error: "เทแนนท์นี้ถูกระงับการใช้งาน" };

    // Resolve SUPER_ADMIN's membership role for the target tenant (may be null)
    const membership = await db.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: session.user.id } },
      select: { role: true },
    });

    return {
      success: true,
      data: { tenantId: tenant.id, tenantRole: membership?.role ?? "OWNER" },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเปลี่ยน tenant ได้" };
  }
}
