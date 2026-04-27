"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type { Cart, CartItem, Product, Playlist } from "@prisma/client";

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
