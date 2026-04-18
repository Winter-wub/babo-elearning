"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";
import type { AuditLog } from "@prisma/client";

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

const GetAuditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  action: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** Paginated audit logs with filters. ADMIN only. */
export async function getAuditLogs(
  filters: z.input<typeof GetAuditLogsSchema> = {},
): Promise<ActionResult<PaginatedResult<AuditLog>>> {
  try {
    await requireAdmin();
    const { page, pageSize, action, entityType, userId, search, from, to } =
      GetAuditLogsSchema.parse(filters);

    const where = {
      ...(action && { action }),
      ...(entityType && { entityType }),
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { userEmail: { contains: search, mode: "insensitive" as const } },
          { entityId: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถโหลดบันทึกการดำเนินการได้",
    };
  }
}

/** Get distinct action types for filter dropdown. ADMIN only. */
export async function getAuditActionTypes(): Promise<ActionResult<string[]>> {
  try {
    await requireAdmin();
    const rows = await db.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });
    return { success: true, data: rows.map((r) => r.action) };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดประเภทการดำเนินการได้" };
  }
}

/** Get distinct entity types for filter dropdown. ADMIN only. */
export async function getAuditEntityTypes(): Promise<ActionResult<string[]>> {
  try {
    await requireAdmin();
    const rows = await db.auditLog.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    });
    return { success: true, data: rows.map((r) => r.entityType) };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดประเภทเอนทิตี้ได้" };
  }
}
