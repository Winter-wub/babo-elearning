"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";
import type { Cart, CartItem, Product, Playlist, Prisma } from "@prisma/client";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("กรุณาเข้าสู่ระบบ");
  }
  return session;
}

// Cart item with product and playlist info
export type CartItemWithProduct = CartItem & {
  product: Product & {
    playlist: Pick<Playlist, "id" | "title" | "slug" | "thumbnailUrl"> & {
      _count: { videos: number };
    };
  };
};

export type CartWithItems = Cart & {
  items: CartItemWithProduct[];
};

// GET CART — returns cart with items, creates if not exists
export async function getCart(): Promise<ActionResult<CartWithItems>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    let cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                playlist: {
                  select: { id: true, title: true, slug: true, thumbnailUrl: true, _count: { select: { videos: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  playlist: {
                    select: { id: true, title: true, slug: true, thumbnailUrl: true, _count: { select: { videos: true } } },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    return { success: true, data: cart };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลตะกร้า" };
  }
}

// ADD TO CART
export async function addToCart(productId: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Validate product exists and is active
    const product = await db.product.findUnique({ where: { id: productId }, include: { playlist: { select: { isActive: true } } } });
    if (!product || !product.isActive || !product.playlist.isActive) {
      return { success: false, error: "สินค้านี้ไม่พร้อมจำหน่าย" };
    }

    // Get or create cart
    let cart = await db.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await db.cart.create({ data: { userId } });
    }

    // Upsert cart item (idempotent - no duplicate)
    await db.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId },
      update: {},
    });

    revalidatePath("/cart");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเพิ่มสินค้า" };
  }
}

// REMOVE FROM CART
export async function removeFromCart(productId: string): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const cart = await db.cart.findUnique({ where: { userId } });
    if (!cart) return { success: true, data: undefined };

    await db.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });

    revalidatePath("/cart");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบสินค้า" };
  }
}

// GET CART ITEM COUNT (lightweight, for header badge)
export async function getCartItemCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user) return 0;

    const cart = await db.cart.findUnique({
      where: { userId: session.user.id },
      select: { _count: { select: { items: true } } },
    });

    return cart?._count.items ?? 0;
  } catch {
    return 0;
  }
}

// CLEAR CART (used after order creation)
export async function clearCart(): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAuth();
    const cart = await db.cart.findUnique({ where: { userId: session.user.id } });
    if (!cart) return { success: true, data: undefined };

    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    revalidatePath("/cart");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถล้างตะกร้า" };
  }
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("ไม่มีสิทธิ์");
  return session;
}

export type AdminCartItem = {
  id: string;
  product: {
    priceSatang: number;
    salePriceSatang: number | null;
    isActive: boolean;
    playlist: { title: string; slug: string; thumbnailUrl: string | null };
  };
};

export type AdminCartRow = {
  id: string;
  userId: string;
  user: { name: string | null; email: string };
  itemCount: number;
  totalSatang: number;
  updatedAt: Date;
  items: AdminCartItem[];
};

const GetAdminCartsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().optional(),
});

export async function getAdminCarts(
  input: z.input<typeof GetAdminCartsSchema> = {}
): Promise<ActionResult<PaginatedResult<AdminCartRow>>> {
  try {
    await requireAdmin();
    const { page, pageSize, search } = GetAdminCartsSchema.parse(input);

    const where: Prisma.CartWhereInput = { items: { some: {} } };
    if (search && search.length > 0) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [carts, total] = await Promise.all([
      db.cart.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              product: {
                select: {
                  priceSatang: true,
                  salePriceSatang: true,
                  isActive: true,
                  playlist: { select: { title: true, slug: true, thumbnailUrl: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.cart.count({ where }),
    ]);

    const items: AdminCartRow[] = carts.map((cart) => ({
      id: cart.id,
      userId: cart.userId,
      user: cart.user,
      itemCount: cart.items.length,
      totalSatang: cart.items.reduce(
        (sum, item) => sum + (item.product.salePriceSatang ?? item.product.priceSatang),
        0
      ),
      updatedAt: cart.updatedAt,
      items: cart.items.map((item) => ({
        id: item.id,
        product: item.product,
      })),
    }));

    return {
      success: true,
      data: { items, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล" };
  }
}
