"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { uploadObject, getPlaybackUrl, deleteObject } from "@/lib/r2";
import { logAdminAction } from "@/lib/audit";
import { notifyNewSlip, notifyOrderApproved, notifyOrderRejected } from "@/lib/notifications";
import {
  ORDER_EXPIRY_HOURS,
  MAX_SLIP_SIZE_BYTES,
  ACCEPTED_SLIP_MIME_TYPES,
  SLIP_KEY_PREFIX,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import {
  validateTransition,
  generateOrderNumber,
} from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";
import type { ActionResult, PaginatedResult } from "@/types";
import type { Order, OrderItem, Product, Playlist, PaymentSlip } from "@prisma/client";
import { randomUUID } from "crypto";

// -----------------------------------------------------------------------
// Auth helpers
// -----------------------------------------------------------------------

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("กรุณาเข้าสู่ระบบ");
  return session;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("ไม่มีสิทธิ์");
  return session;
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type OrderWithItems = Order & {
  items: (OrderItem & { product: { playlist: Pick<Playlist, "id" | "title" | "slug"> } })[];
  user: Pick<import("@prisma/client").User, "id" | "name" | "email">;
  paymentSlip: Pick<PaymentSlip, "id" | "contentType" | "fileSize" | "uploadedAt"> | null;
};

// -----------------------------------------------------------------------
// Student actions
// -----------------------------------------------------------------------

/** Create an order from the current cart. Snapshots prices. */
export async function createOrder(): Promise<ActionResult<{ orderId: string }>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Fetch cart with items
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { playlist: { select: { id: true, title: true } } },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, error: "ตะกร้าว่างเปล่า" };
    }

    // Check for existing active order
    const existingOrder = await db.order.findFirst({
      where: {
        userId,
        status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_VERIFICATION] },
      },
    });
    if (existingOrder) {
      return { success: false, error: "คุณมีคำสั่งซื้อที่ยังไม่เสร็จสิ้น กรุณาชำระเงินหรือยกเลิกก่อน" };
    }

    // Validate all products are still active
    for (const item of cart.items) {
      if (!item.product.isActive) {
        return { success: false, error: `สินค้า "${item.product.playlist.title}" ไม่พร้อมจำหน่ายแล้ว` };
      }
    }

    // Calculate total from current prices (snapshot)
    const totalSatang = cart.items.reduce((sum, item) => {
      return sum + (item.product.salePriceSatang ?? item.product.priceSatang);
    }, 0);

    // Create order + items in transaction
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          status: OrderStatus.PENDING_PAYMENT,
          totalSatang,
          expiresAt: new Date(Date.now() + ORDER_EXPIRY_HOURS * 60 * 60 * 1000),
        },
      });

      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          playlistId: item.product.playlist.id,
          snapshotTitle: item.product.playlist.title,
          snapshotPriceSatang: item.product.salePriceSatang ?? item.product.priceSatang,
          snapshotAccessDurationDays: item.product.accessDurationDays,
        })),
      });

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    revalidatePath("/cart");
    revalidatePath("/orders");
    return { success: true, data: { orderId: order.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างคำสั่งซื้อ" };
  }
}

/** Upload payment slip for an order. */
export async function uploadSlip(orderId: string, formData: FormData): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Validate order ownership and status
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== userId) {
      return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    }
    if (!validateTransition(order.status, OrderStatus.PENDING_VERIFICATION)) {
      return { success: false, error: "ไม่สามารถอัปโหลดสลิปในสถานะนี้" };
    }

    // Check expiry
    if (order.expiresAt < new Date()) {
      await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.EXPIRED } });
      return { success: false, error: "คำสั่งซื้อหมดอายุแล้ว" };
    }

    // Rate limit: max 5 slips per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSlips = await db.paymentSlip.count({
      where: {
        order: { userId },
        uploadedAt: { gte: oneHourAgo },
      },
    });
    if (recentSlips >= 5) {
      return { success: false, error: "อัปโหลดสลิปบ่อยเกินไป กรุณารอสักครู่" };
    }

    // Validate file
    const file = formData.get("slip") as File | null;
    if (!file) {
      return { success: false, error: "กรุณาเลือกไฟล์สลิป" };
    }
    if (file.size > MAX_SLIP_SIZE_BYTES) {
      return { success: false, error: "ไฟล์ใหญ่เกินไป (สูงสุด 10MB)" };
    }
    if (!ACCEPTED_SLIP_MIME_TYPES.includes(file.type as any)) {
      return { success: false, error: "รองรับเฉพาะไฟล์ JPG, PNG, WebP" };
    }

    // Upload to R2
    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `${SLIP_KEY_PREFIX}${orderId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject(key, buffer, file.type);

    // Delete old slip if re-uploading (rejected order)
    const existingSlip = await db.paymentSlip.findUnique({ where: { orderId } });

    // Create slip record and update order status atomically
    await db.$transaction(async (tx) => {
      if (existingSlip) {
        await tx.paymentSlip.delete({ where: { orderId } });
      }
      await tx.paymentSlip.create({
        data: { orderId, s3Key: key, contentType: file.type, fileSize: file.size },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PENDING_VERIFICATION, paidAt: new Date() },
      });
    });

    // Clean up old R2 object outside transaction (best-effort)
    if (existingSlip) {
      deleteObject(existingSlip.s3Key).catch(() => {});
    }

    // Fire-and-forget notifications
    const orderDetail = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { name: true, email: true } }, items: true },
    });
    if (orderDetail) {
      notifyNewSlip({
        orderNumber: orderDetail.orderNumber,
        orderId,
        studentName: orderDetail.user.name ?? "นักเรียน",
        studentEmail: orderDetail.user.email,
        totalSatang: orderDetail.totalSatang,
        courseTitles: orderDetail.items.map((i) => i.snapshotTitle),
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปโหลดสลิป" };
  }
}

/** Cancel a pending order. */
export async function cancelOrder(orderId: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== session.user.id) {
      return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    }
    if (!validateTransition(order.status, OrderStatus.CANCELLED)) {
      return { success: false, error: "ไม่สามารถยกเลิกคำสั่งซื้อในสถานะนี้" };
    }
    await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถยกเลิก" };
  }
}

/** Get student's own orders. */
export async function getMyOrders(page = 1): Promise<ActionResult<PaginatedResult<Order>>> {
  try {
    const session = await requireAuth();
    const pageSize = DEFAULT_PAGE_SIZE;
    const where = { userId: session.user.id };

    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true },
      }),
      db.order.count({ where }),
    ]);

    return { success: true, data: { items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล" };
  }
}

/** Get student's own order detail. Never returns s3Key. */
export async function getMyOrderDetail(orderId: string): Promise<ActionResult<OrderWithItems>> {
  try {
    const session = await requireAuth();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: { include: { playlist: { select: { id: true, title: true, slug: true } } } } },
        },
        user: { select: { id: true, name: true, email: true } },
        paymentSlip: { select: { id: true, contentType: true, fileSize: true, uploadedAt: true } },
      },
    });

    if (!order || order.userId !== session.user.id) {
      return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    }

    // Lazy expiry check
    if (order.status === OrderStatus.PENDING_PAYMENT && order.expiresAt < new Date()) {
      await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.EXPIRED } });
      (order as any).status = OrderStatus.EXPIRED;
    }

    return { success: true, data: order as OrderWithItems };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล" };
  }
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

const GetAdminOrdersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  status: z.nativeEnum(OrderStatus).optional(),
});

export async function getAdminOrders(
  input: z.input<typeof GetAdminOrdersSchema> = {}
): Promise<ActionResult<PaginatedResult<OrderWithItems>>> {
  try {
    await requireAdmin();
    const { page, pageSize, status } = GetAdminOrdersSchema.parse(input);
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { include: { product: { include: { playlist: { select: { id: true, title: true, slug: true } } } } } },
          user: { select: { id: true, name: true, email: true } },
          paymentSlip: { select: { id: true, contentType: true, fileSize: true, uploadedAt: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return { success: true, data: { items: items as OrderWithItems[], meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล" };
  }
}

export async function getAdminOrderDetail(orderId: string): Promise<ActionResult<OrderWithItems>> {
  try {
    await requireAdmin();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { playlist: { select: { id: true, title: true, slug: true } } } } } },
        user: { select: { id: true, name: true, email: true } },
        paymentSlip: { select: { id: true, contentType: true, fileSize: true, uploadedAt: true } },
      },
    });
    if (!order) return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    return { success: true, data: order as OrderWithItems };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล" };
  }
}

export async function approveOrder(orderId: string, adminNote?: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { playlist: { include: { videos: { select: { videoId: true } } } } } },
          },
        },
      },
    });

    if (!order) return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    if (!validateTransition(order.status, OrderStatus.APPROVED)) {
      return { success: false, error: "ไม่สามารถอนุมัติคำสั่งซื้อในสถานะนี้" };
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.APPROVED, approvedAt: new Date(), adminId: session.user.id, adminNote: adminNote || null },
      });

      for (const item of order.items) {
        const videoIds = item.product.playlist.videos.map((v) => v.videoId);
        const durationDays = item.snapshotAccessDurationDays;
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + durationDays);

        for (const videoId of videoIds) {
          const existing = await tx.videoPermission.findUnique({
            where: { userId_videoId: { userId: order.userId, videoId } },
          });

          if (!existing) {
            await tx.videoPermission.create({
              data: { userId: order.userId, videoId, grantedBy: session.user.id, validUntil, durationDays },
            });
          } else if (!existing.validUntil || existing.validUntil < validUntil) {
            await tx.videoPermission.update({
              where: { userId_videoId: { userId: order.userId, videoId } },
              data: { validUntil, durationDays, grantedBy: session.user.id },
            });
          }
        }
      }
    });

    logAdminAction(session, "ORDER_APPROVE", "Order", orderId, { adminNote });

    const user = await db.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    if (user) {
      notifyOrderApproved({
        studentEmail: user.email,
        studentName: user.name ?? "นักเรียน",
        orderNumber: order.orderNumber,
        courseTitles: order.items.map((i) => i.product.playlist.title),
        totalSatang: order.totalSatang,
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอนุมัติ" };
  }
}

export async function rejectOrder(orderId: string, reason: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    if (!reason.trim()) return { success: false, error: "กรุณาระบุเหตุผล" };

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "ไม่พบคำสั่งซื้อ" };
    if (!validateTransition(order.status, OrderStatus.REJECTED)) {
      return { success: false, error: "ไม่สามารถปฏิเสธคำสั่งซื้อในสถานะนี้" };
    }

    await db.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REJECTED, rejectedAt: new Date(), rejectionReason: reason, adminId: session.user.id },
    });

    logAdminAction(session, "ORDER_REJECT", "Order", orderId, { reason });

    const user = await db.user.findUnique({ where: { id: order.userId }, select: { name: true, email: true } });
    if (user) {
      notifyOrderRejected({
        studentEmail: user.email,
        studentName: user.name ?? "นักเรียน",
        orderNumber: order.orderNumber,
        reason,
        orderId,
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถปฏิเสธ" };
  }
}

export async function getPendingOrderCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") return 0;
    return db.order.count({ where: { status: OrderStatus.PENDING_VERIFICATION } });
  } catch {
    return 0;
  }
}
