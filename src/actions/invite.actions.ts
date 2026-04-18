"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { INVITE_CODE_BYTES, MAX_INVITE_VIDEOS } from "@/lib/constants";
import { getInviteLinkStatus, getPermissionLabel } from "@/lib/invite-utils";
import { logAdminAction } from "@/lib/audit";
import type {
  ActionResult,
  PaginatedResult,
  InviteLinkRow,
  InviteLinkDetail,
  PublicInviteLinkInfo,
} from "@/types";

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
// Zod Schemas
// -----------------------------------------------------------------------

const CreateInviteLinkSchema = z.object({
  label: z.string().min(1, "กรุณาระบุชื่อลิงก์").max(100),
  videoIds: z
    .array(z.string())
    .min(1, "กรุณาเลือกวิดีโออย่างน้อย 1 รายการ")
    .max(MAX_INVITE_VIDEOS),
  timeMode: z.enum(["permanent", "relative", "absolute"]),
  durationDays: z.number().int().min(0).max(3650).nullable().optional(),
  durationHours: z.number().int().min(0).max(8760).nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
}).refine(
  (val) => {
    if (val.timeMode === "relative") {
      const days = val.durationDays ?? 0;
      const hours = val.durationHours ?? 0;
      return days > 0 || hours > 0;
    }
    return true;
  },
  { message: "กรุณาระบุระยะเวลา" },
).refine(
  (val) => {
    if (val.timeMode === "absolute") {
      return val.validFrom && val.validUntil && val.validUntil > val.validFrom;
    }
    return true;
  },
  { message: "วันที่สิ้นสุดต้องหลังจากวันที่เริ่มต้น" },
);

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** Create a new invite link. ADMIN only. */
export async function createInviteLink(
  data: z.input<typeof CreateInviteLinkSchema>,
): Promise<ActionResult<{ inviteUrl: string; id: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = CreateInviteLinkSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    const { label, videoIds, timeMode, durationDays, durationHours, validFrom, validUntil, maxRedemptions, expiresAt } = parsed.data;

    // Validate all video IDs exist and are active
    const videos = await db.video.findMany({
      where: { id: { in: videoIds }, isActive: true },
      select: { id: true },
    });
    if (videos.length !== videoIds.length) {
      return { success: false, error: "วิดีโอบางรายการไม่พบหรือไม่ได้เปิดใช้งาน" };
    }

    // Validate expiresAt is in the future
    if (expiresAt && expiresAt <= new Date()) {
      return { success: false, error: "วันหมดอายุต้องเป็นวันในอนาคต" };
    }

    const code = randomBytes(INVITE_CODE_BYTES).toString("hex");

    const invite = await db.inviteLink.create({
      data: {
        code,
        label,
        videoIds,
        timeMode,
        durationDays: timeMode === "relative" ? durationDays ?? null : null,
        durationHours: timeMode === "relative" ? durationHours ?? null : null,
        validFrom: timeMode === "absolute" ? validFrom ?? null : null,
        validUntil: timeMode === "absolute" ? validUntil ?? null : null,
        maxRedemptions: maxRedemptions ?? null,
        expiresAt: expiresAt ?? null,
        createdBy: session.user.id,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/register?invite=${code}`;

    logAdminAction(session, "INVITE_CREATE", "InviteLink", invite.id, { label, videoCount: videoIds.length });
    revalidatePath("/admin/invite-links");

    return { success: true, data: { inviteUrl, id: invite.id } };
  } catch {
    return { success: false, error: "ไม่สามารถสร้างลิงก์เชิญได้" };
  }
}

/** List invite links with pagination and filters. ADMIN only. */
export async function listInviteLinks(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<ActionResult<PaginatedResult<InviteLinkRow>>> {
  try {
    await requireAdmin();

    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (options?.search) {
      where.label = { contains: options.search, mode: "insensitive" };
    }

    // Status filtering is done post-query since it's computed
    const [items, total] = await Promise.all([
      db.inviteLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize * 2, // fetch extra for post-filtering
      }),
      db.inviteLink.count({ where }),
    ]);

    const now = new Date();
    let rows: InviteLinkRow[] = items.map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      videoIds: item.videoIds,
      timeMode: item.timeMode,
      durationDays: item.durationDays,
      durationHours: item.durationHours,
      validFrom: item.validFrom,
      validUntil: item.validUntil,
      maxRedemptions: item.maxRedemptions,
      currentRedemptions: item.currentRedemptions,
      expiresAt: item.expiresAt,
      isRevoked: item.isRevoked,
      createdAt: item.createdAt,
      status: getInviteLinkStatus(item, now),
      videoCount: item.videoIds.length,
    }));

    // Apply status filter if specified
    if (options?.status && options.status !== "all") {
      rows = rows.filter((r) => r.status === options.status);
    }

    const filteredRows = rows.slice(0, pageSize);

    return {
      success: true,
      data: {
        items: filteredRows,
        meta: {
          total: options?.status && options.status !== "all" ? rows.length : total,
          page,
          pageSize,
          totalPages: Math.ceil(
            (options?.status && options.status !== "all" ? rows.length : total) / pageSize,
          ),
        },
      },
    };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดรายการลิงก์เชิญได้" };
  }
}

/** Get full invite link detail with videos and redemptions. ADMIN only. */
export async function getInviteLinkDetail(
  id: string,
): Promise<ActionResult<InviteLinkDetail>> {
  try {
    await requireAdmin();

    const invite = await db.inviteLink.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        redemptions: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { redeemedAt: "desc" },
        },
      },
    });

    if (!invite) {
      return { success: false, error: "ไม่พบลิงก์เชิญ" };
    }

    // Fetch video titles for the stored IDs
    const videos = await db.video.findMany({
      where: { id: { in: invite.videoIds } },
      select: { id: true, title: true },
    });

    const now = new Date();
    const detail: InviteLinkDetail = {
      id: invite.id,
      code: invite.code,
      label: invite.label,
      videoIds: invite.videoIds,
      timeMode: invite.timeMode,
      durationDays: invite.durationDays,
      durationHours: invite.durationHours,
      validFrom: invite.validFrom,
      validUntil: invite.validUntil,
      maxRedemptions: invite.maxRedemptions,
      currentRedemptions: invite.currentRedemptions,
      expiresAt: invite.expiresAt,
      isRevoked: invite.isRevoked,
      createdAt: invite.createdAt,
      status: getInviteLinkStatus(invite, now),
      videoCount: invite.videoIds.length,
      videos,
      redemptions: invite.redemptions.map((r) => ({
        id: r.id,
        redeemedAt: r.redeemedAt,
        user: r.user,
      })),
      creator: invite.creator,
    };

    return { success: true, data: detail };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดรายละเอียดลิงก์เชิญได้" };
  }
}

/** Revoke an invite link. Does NOT revoke already-granted permissions. ADMIN only. */
export async function revokeInviteLink(
  id: string,
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();

    await db.inviteLink.update({
      where: { id },
      data: { isRevoked: true },
    });

    logAdminAction(session, "INVITE_REVOKE", "InviteLink", id);
    revalidatePath("/admin/invite-links");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "ไม่สามารถยกเลิกลิงก์เชิญได้" };
  }
}

/** Validate an invite code. PUBLIC — no auth required. */
export async function validateInviteCode(
  code: string,
): Promise<ActionResult<PublicInviteLinkInfo>> {
  try {
    if (!code || typeof code !== "string" || code.length < 1) {
      return {
        success: true,
        data: { valid: false, videoCount: 0, permissionLabel: "" },
      };
    }

    const invite = await db.inviteLink.findUnique({
      where: { code },
    });

    if (!invite) {
      return {
        success: true,
        data: { valid: false, videoCount: 0, permissionLabel: "" },
      };
    }

    const now = new Date();
    const status = getInviteLinkStatus(invite, now);

    if (status !== "active") {
      return {
        success: true,
        data: { valid: false, videoCount: 0, permissionLabel: "" },
      };
    }

    // Fetch video titles to show on the registration page
    const videos = await db.video.findMany({
      where: { id: { in: invite.videoIds }, isActive: true },
      select: { title: true },
    });

    return {
      success: true,
      data: {
        valid: true,
        label: invite.label,
        videoTitles: videos.map((v) => v.title),
        videoCount: videos.length,
        permissionLabel: getPermissionLabel(invite),
      },
    };
  } catch {
    return {
      success: true,
      data: { valid: false, videoCount: 0, permissionLabel: "" },
    };
  }
}

/** Get all active videos for invite link video selector. ADMIN only. */
export async function getVideosForInviteSelect(): Promise<
  ActionResult<{ id: string; title: string }[]>
> {
  try {
    await requireAdmin();

    const videos = await db.video.findMany({
      where: { isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });

    return { success: true, data: videos };
  } catch {
    return { success: false, error: "ไม่สามารถโหลดรายการวิดีโอได้" };
  }
}
