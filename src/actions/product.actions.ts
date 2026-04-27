"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ActionResult, PaginatedResult } from "@/types";
import type { Product, Playlist } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------

const CreateProductSchema = z.object({
  playlistId: z.string().min(1, "จำเป็นต้องเลือกเพลย์ลิสต์"),
  priceSatang: z.number().int().min(0, "ราคาต้องไม่ติดลบ"),
  salePriceSatang: z.number().int().min(0).nullable().optional(),
  accessDurationDays: z.number().int().min(1).default(365),
});

const UpdateProductSchema = z.object({
  priceSatang: z.number().int().min(0).optional(),
  salePriceSatang: z.number().int().min(0).nullable().optional(),
  accessDurationDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const GetProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
});

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type ProductWithPlaylist = Product & {
  playlist: Pick<Playlist, "id" | "title" | "slug" | "thumbnailUrl" | "thumbnailKey" | "isActive"> & {
    _count: { videos: number };
  };
};

type PublicProductWithPlaylist = Product & {
  playlist: Pick<Playlist, "id" | "title" | "slug" | "thumbnailUrl" | "isActive"> & {
    _count: { videos: number };
  };
};

// -----------------------------------------------------------------------
// Admin CRUD actions
// -----------------------------------------------------------------------

/** Create a product linked to a playlist. */
export async function createProduct(
  input: z.input<typeof CreateProductSchema>
): Promise<ActionResult<Product>> {
  try {
    const session = await requireAdmin();
    const data = CreateProductSchema.parse(input);

    const playlist = await db.playlist.findUnique({
      where: { id: data.playlistId },
    });
    if (!playlist)
      return { success: false, error: "ไม่พบเพลย์ลิสต์" };

    const existing = await db.product.findUnique({
      where: { playlistId: data.playlistId },
    });
    if (existing)
      return { success: false, error: "เพลย์ลิสต์นี้มีสินค้าอยู่แล้ว" };

    if (
      data.salePriceSatang != null &&
      data.salePriceSatang >= data.priceSatang
    ) {
      return {
        success: false,
        error: "ราคาลดต้องน้อยกว่าราคาปกติ",
      };
    }

    const product = await db.product.create({
      data: {
        playlistId: data.playlistId,
        priceSatang: data.priceSatang,
        salePriceSatang: data.salePriceSatang ?? null,
        accessDurationDays: data.accessDurationDays,
      },
    });

    logAdminAction(session, "PRODUCT_CREATE", "Product", product.id, {
      playlistId: data.playlistId,
      priceSatang: data.priceSatang,
    });
    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้างสินค้า",
    };
  }
}

/** Update an existing product. */
export async function updateProduct(
  id: string,
  input: z.input<typeof UpdateProductSchema>
): Promise<ActionResult<Product>> {
  try {
    const session = await requireAdmin();
    const data = UpdateProductSchema.parse(input);

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing)
      return { success: false, error: "ไม่พบสินค้า" };

    const newPrice = data.priceSatang ?? existing.priceSatang;
    const newSale =
      data.salePriceSatang !== undefined
        ? data.salePriceSatang
        : existing.salePriceSatang;
    if (newSale != null && newSale >= newPrice) {
      return {
        success: false,
        error: "ราคาลดต้องน้อยกว่าราคาปกติ",
      };
    }

    const product = await db.product.update({ where: { id }, data });

    logAdminAction(session, "PRODUCT_UPDATE", "Product", id, data);
    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตสินค้า",
    };
  }
}

/** List products (admin, paginated). */
export async function getProducts(
  input: z.input<typeof GetProductsSchema> = {}
): Promise<ActionResult<PaginatedResult<ProductWithPlaylist>>> {
  try {
    await requireAdmin();
    const { page, pageSize, search } = GetProductsSchema.parse(input);

    const where = search
      ? {
          playlist: {
            title: { contains: search, mode: "insensitive" as const },
          },
        }
      : {};

    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          playlist: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailUrl: true,
              thumbnailKey: true,
              isActive: true,
              _count: { select: { videos: true } },
            },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลสินค้า",
    };
  }
}

/** Get playlists without products (for create form dropdown). */
export async function getAvailablePlaylists(): Promise<
  ActionResult<Pick<Playlist, "id" | "title">[]>
> {
  try {
    await requireAdmin();
    const playlists = await db.playlist.findMany({
      where: { isActive: true, product: { is: null } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
    return { success: true, data: playlists };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล",
    };
  }
}

// -----------------------------------------------------------------------
// Public actions (no auth required)
// -----------------------------------------------------------------------

/** Get active products for public course browsing. */
export async function getPublicProducts(): Promise<
  ActionResult<PublicProductWithPlaylist[]>
> {
  try {
    const items = await db.product.findMany({
      where: {
        isActive: true,
        playlist: { isActive: true },
      },
      orderBy: { createdAt: "desc" },
      include: {
        playlist: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            isActive: true,
            _count: { select: { videos: true } },
          },
        },
      },
    });
    return { success: true, data: items };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล",
    };
  }
}
