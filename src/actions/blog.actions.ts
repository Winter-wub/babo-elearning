"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getUploadUrl, getPlaybackUrl, deleteObject } from "@/lib/r2";
import { sanitizeBlogContent, hasContentOrMedia } from "@/lib/blog-sanitize";
import {
  BLOG_POSTS_PER_PAGE,
  MAX_BLOG_TITLE_LENGTH,
  MAX_BLOG_EXCERPT_LENGTH,
  MAX_BLOG_CONTENT_LENGTH,
  BLOG_IMAGE_KEY_PREFIX,
  BLOG_SLUG_PATTERN,
  RESERVED_BLOG_SLUGS,
  ACCEPTED_BLOG_IMAGE_TYPES,
  MAX_BLOG_IMAGE_SIZE_BYTES,
  BLOG_VIDEO_KEY_PREFIX,
  ACCEPTED_BLOG_VIDEO_TYPES,
} from "@/lib/constants";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult, PaginatedResult, AdminBlogPostRow, AdminBlogPostDetail, PublicBlogPost, BlogPostDetail, BlogCategoryWithCount } from "@/types";
import type { BlogCategory } from "@prisma/client";

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

/** Generate a stable image URL that goes through our API route proxy. */
function blogImageUrl(key: string | null): string | null {
  if (!key) return null;
  return `/api/blog/images/${key}`;
}

/** Generate slug from title — strips non-alphanumeric, lowercases. */
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

/** Detect Prisma unique constraint error. */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

function revalidateBlogPaths() {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const CreateBlogPostSchema = z.object({
  title: z.string().min(1, "จำเป็นต้องระบุชื่อบทความ").max(MAX_BLOG_TITLE_LENGTH),
  slug: z.string().min(3, "slug ต้องมีอย่างน้อย 3 ตัวอักษร").max(200).regex(BLOG_SLUG_PATTERN, "slug ต้องเป็นตัวพิมพ์เล็กและตัวเลข คั่นด้วย -"),
  excerpt: z.string().max(MAX_BLOG_EXCERPT_LENGTH).optional().default(""),
  content: z.string().max(MAX_BLOG_CONTENT_LENGTH).default(""),
  featuredImageKey: z.string().optional(),
  featuredImageAlt: z.string().max(255).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  categoryIds: z.array(z.string()).default([]),
  playlistIds: z.array(z.string()).default([]),
});

const UpdateBlogPostSchema = z.object({
  title: z.string().min(1).max(MAX_BLOG_TITLE_LENGTH).optional(),
  slug: z.string().min(3).max(200).regex(BLOG_SLUG_PATTERN).optional(),
  excerpt: z.string().max(MAX_BLOG_EXCERPT_LENGTH).optional(),
  content: z.string().max(MAX_BLOG_CONTENT_LENGTH).optional(),
  featuredImageKey: z.string().nullable().optional(),
  featuredImageAlt: z.string().max(255).nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  categoryIds: z.array(z.string()).optional(),
  playlistIds: z.array(z.string()).optional(),
});

const CreateCategorySchema = z.object({
  name: z.string().min(1, "จำเป็นต้องระบุชื่อหมวดหมู่").max(100),
  slug: z.string().min(2).max(100).regex(BLOG_SLUG_PATTERN, "slug ต้องเป็นตัวพิมพ์เล็กและตัวเลข"),
  description: z.string().max(500).optional(),
  color: z.string().max(100).optional(),
  sortOrder: z.coerce.number().int().default(0),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(100).regex(BLOG_SLUG_PATTERN).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().max(100).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// -----------------------------------------------------------------------
// Public actions (no auth required)
// -----------------------------------------------------------------------

/** Fetch published blog posts with pagination and optional category filter. */
export async function getPublishedBlogPosts(
  page: number = 1,
  categorySlug?: string
): Promise<PaginatedResult<PublicBlogPost>> {
  const pageSize = BLOG_POSTS_PER_PAGE;
  const skip = (page - 1) * pageSize;

  const where = {
    status: "PUBLISHED" as const,
    ...(categorySlug && {
      categories: { some: { category: { slug: categorySlug } } },
    }),
  };

  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        author: { select: { name: true } },
        categories: {
          include: { category: { select: { id: true, name: true, slug: true, color: true } } },
        },
      },
    }),
    db.blogPost.count({ where }),
  ]);

  const items: PublicBlogPost[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    featuredImageUrl: blogImageUrl(post.featuredImageKey),
    author: { name: post.author?.name ?? null },
    categories: post.categories.map((pc) => pc.category),
  }));

  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/** Fetch a single published blog post by slug. */
export async function getPublishedBlogPost(
  slug: string
): Promise<BlogPostDetail | null> {
  const post = await db.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { name: true } },
      categories: {
        include: { category: { select: { id: true, name: true, slug: true, color: true } } },
      },
      playlists: {
        orderBy: { position: "asc" },
        include: {
          playlist: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              slug: true,
              isActive: true,
              _count: { select: { videos: true } },
            },
          },
        },
      },
    },
  });

  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    featuredImageUrl: blogImageUrl(post.featuredImageKey),
    author: { name: post.author?.name ?? null },
    categories: post.categories.map((pc) => pc.category),
    playlists: post.playlists
      .filter((bp) => bp.playlist.isActive)
      .map((bp) => ({
        id: bp.playlist.id,
        title: bp.playlist.title,
        description: bp.playlist.description,
        thumbnailUrl: bp.playlist.thumbnailUrl,
        slug: bp.playlist.slug,
        videoCount: bp.playlist._count.videos,
      })),
  };
}

/** Fetch all blog categories (public). */
export async function getBlogCategories(): Promise<BlogCategory[]> {
  return db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

/** Get all blog posts for admin table. */
export async function getAdminBlogPosts(
  page: number = 1,
  search?: string,
  status?: "DRAFT" | "PUBLISHED"
): Promise<ActionResult<PaginatedResult<AdminBlogPostRow>>> {
  try {
    await requireAdmin();
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          author: { select: { name: true } },
          categories: {
            include: { category: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      db.blogPost.count({ where }),
    ]);

    const items: AdminBlogPostRow[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      featuredImageUrl: blogImageUrl(post.featuredImageKey),
      author: post.author ? { name: post.author.name } : null,
      categories: post.categories.map((pc) => pc.category),
    }));

    return {
      success: true,
      data: {
        items,
        meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลบทความได้" };
  }
}

/** Get a single blog post for admin editing. */
export async function getAdminBlogPost(
  id: string
): Promise<ActionResult<AdminBlogPostDetail>> {
  try {
    await requireAdmin();
    const post = await db.blogPost.findUnique({
      where: { id },
      include: {
        categories: { select: { categoryId: true } },
        playlists: { select: { playlistId: true }, orderBy: { position: "asc" } },
      },
    });

    if (!post) {
      return { success: false, error: "ไม่พบบทความ" };
    }

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImageKey: post.featuredImageKey,
        featuredImageAlt: post.featuredImageAlt,
        featuredImageUrl: blogImageUrl(post.featuredImageKey),
        status: post.status,
        publishedAt: post.publishedAt,
        authorId: post.authorId,
        categoryIds: post.categories.map((c) => c.categoryId),
        playlistIds: post.playlists.map((p) => p.playlistId),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลบทความได้" };
  }
}

/** Create a new blog post. */
export async function createBlogPost(
  input: z.input<typeof CreateBlogPostSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const session = await requireAdmin();
    const data = CreateBlogPostSchema.parse(input);

    // Validate slug
    if (RESERVED_BLOG_SLUGS.has(data.slug)) {
      return { success: false, error: `"${data.slug}" เป็น slug ที่สงวนไว้ กรุณาเลือกชื่ออื่น` };
    }

    // Validate published posts have content
    if (data.status === "PUBLISHED") {
      if (!hasContentOrMedia(data.content)) {
        return { success: false, error: "บทความที่เผยแพร่ต้องมีเนื้อหา" };
      }
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeBlogContent(data.content);

    const post = await db.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: sanitizedContent,
        featuredImageKey: data.featuredImageKey || null,
        featuredImageAlt: data.featuredImageAlt || null,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        authorId: session.user.id,
        categories: {
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        },
        playlists: {
          create: data.playlistIds.map((playlistId, idx) => ({ playlistId, position: idx })),
        },
      },
    });

    logAdminAction(session, "BLOG_CREATE", "BlogPost", post.id, { title: data.title, slug: data.slug });
    revalidateBlogPaths();
    return { success: true, data: { id: post.id, slug: post.slug } };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "slug นี้ถูกใช้งานแล้ว กรุณาเลือก slug อื่น" };
    }
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างบทความได้" };
  }
}

/** Update an existing blog post. */
export async function updateBlogPost(
  id: string,
  input: z.input<typeof UpdateBlogPostSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const session = await requireAdmin();
    const data = UpdateBlogPostSchema.parse(input);

    // Validate reserved slugs
    if (data.slug && RESERVED_BLOG_SLUGS.has(data.slug)) {
      return { success: false, error: `"${data.slug}" เป็น slug ที่สงวนไว้` };
    }

    // Get existing post for publishedAt logic
    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "ไม่พบบทความ" };
    }

    // Validate published posts have content
    const finalContent = data.content ?? existing.content;
    const finalStatus = data.status ?? existing.status;
    if (finalStatus === "PUBLISHED" && !hasContentOrMedia(finalContent)) {
      return { success: false, error: "บทความที่เผยแพร่ต้องมีเนื้อหา" };
    }

    // Sanitize content if changed
    const sanitizedContent = data.content !== undefined
      ? sanitizeBlogContent(data.content)
      : undefined;

    // Set publishedAt on first publish
    let publishedAt = existing.publishedAt;
    if (data.status === "PUBLISHED" && !existing.publishedAt) {
      publishedAt = new Date();
    }

    // Handle category sync
    const categoryUpdate = data.categoryIds !== undefined
      ? {
          deleteMany: {},
          create: data.categoryIds.map((categoryId) => ({ categoryId })),
        }
      : undefined;

    // Handle playlist sync
    const playlistUpdate = data.playlistIds !== undefined
      ? {
          deleteMany: {},
          create: data.playlistIds.map((playlistId, idx) => ({ playlistId, position: idx })),
        }
      : undefined;

    const post = await db.blogPost.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt || null }),
        ...(sanitizedContent !== undefined && { content: sanitizedContent }),
        ...(data.featuredImageKey !== undefined && { featuredImageKey: data.featuredImageKey }),
        ...(data.featuredImageAlt !== undefined && { featuredImageAlt: data.featuredImageAlt }),
        ...(data.status !== undefined && { status: data.status }),
        publishedAt,
        ...(categoryUpdate && { categories: categoryUpdate }),
        ...(playlistUpdate && { playlists: playlistUpdate }),
      },
    });

    logAdminAction(session, "BLOG_UPDATE", "BlogPost", id, { title: data.title, slug: data.slug });
    revalidateBlogPaths();
    if (existing.slug !== post.slug) {
      revalidatePath(`/blog/${existing.slug}`);
    }
    revalidatePath(`/blog/${post.slug}`);

    return { success: true, data: { id: post.id, slug: post.slug } };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "slug นี้ถูกใช้งานแล้ว กรุณาเลือก slug อื่น" };
    }
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตบทความได้" };
  }
}

/** Delete a blog post and clean up R2 featured image. */
export async function deleteBlogPost(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    const post = await db.blogPost.findUnique({ where: { id } });
    if (!post) {
      return { success: false, error: "ไม่พบบทความ" };
    }

    // Delete from DB first (cascades categories)
    await db.blogPost.delete({ where: { id } });

    // Clean up R2 featured image (best-effort)
    if (post.featuredImageKey) {
      try {
        await deleteObject(post.featuredImageKey);
      } catch {
        // Non-critical — log in production
      }
    }

    logAdminAction(session, "BLOG_DELETE", "BlogPost", id, { title: post.title, slug: post.slug });
    revalidateBlogPaths();
    revalidatePath(`/blog/${post.slug}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบบทความได้" };
  }
}

/** Toggle blog post status between DRAFT and PUBLISHED. */
export async function toggleBlogPostStatus(
  id: string
): Promise<ActionResult<{ status: "DRAFT" | "PUBLISHED" }>> {
  try {
    const session = await requireAdmin();
    const post = await db.blogPost.findUnique({ where: { id } });
    if (!post) {
      return { success: false, error: "ไม่พบบทความ" };
    }

    const newStatus = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    // Validate content before publishing
    if (newStatus === "PUBLISHED" && !hasContentOrMedia(post.content)) {
      return { success: false, error: "บทความที่เผยแพร่ต้องมีเนื้อหา" };
    }

    await db.blogPost.update({
      where: { id },
      data: {
        status: newStatus,
        publishedAt: newStatus === "PUBLISHED" && !post.publishedAt ? new Date() : post.publishedAt,
      },
    });

    logAdminAction(session, "BLOG_TOGGLE_STATUS", "BlogPost", id, { from: post.status, to: newStatus });
    revalidateBlogPaths();
    revalidatePath(`/blog/${post.slug}`);
    return { success: true, data: { status: newStatus } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถเปลี่ยนสถานะได้" };
  }
}

/** Generate a slug suggestion from a title. */
export async function generateBlogSlug(
  title: string
): Promise<ActionResult<string>> {
  try {
    await requireAdmin();
    let slug = generateSlugFromTitle(title);

    if (!slug || slug.length < 3) {
      // Fallback for Thai-only titles
      slug = `post-${Date.now().toString(36)}`;
    }

    // Check uniqueness and append suffix if needed
    const existing = await db.blogPost.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    return { success: true, data: slug };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้าง slug ได้" };
  }
}

/** Get a presigned upload URL for a blog image. */
export async function getUploadBlogImageUrl(
  filename: string,
  contentType: string
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_BLOG_IMAGE_TYPES.includes(contentType as typeof ACCEPTED_BLOG_IMAGE_TYPES[number])) {
      return { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง รองรับ: PNG, JPEG, WebP, GIF" };
    }

    // Generate a unique key under the blog-images prefix
    const id = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${BLOG_IMAGE_KEY_PREFIX}${id}/${sanitizedFilename}`;

    const uploadUrl = await getUploadUrl(key, contentType);
    return { success: true, data: { uploadUrl, key } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL อัปโหลดได้" };
  }
}

/** Get a presigned upload URL for a blog video. */
export async function getUploadBlogVideoUrl(
  filename: string,
  contentType: string
): Promise<ActionResult<{ uploadUrl: string; key: string }>> {
  try {
    await requireAdmin();

    if (!ACCEPTED_BLOG_VIDEO_TYPES.includes(contentType as typeof ACCEPTED_BLOG_VIDEO_TYPES[number])) {
      return { success: false, error: "ประเภทไฟล์ไม่ถูกต้อง รองรับ: MP4, WebM, MOV" };
    }

    const id = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${BLOG_VIDEO_KEY_PREFIX}${id}/${sanitizedFilename}`;

    const uploadUrl = await getUploadUrl(key, contentType);
    return { success: true, data: { uploadUrl, key } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้าง URL อัปโหลดได้" };
  }
}

// -----------------------------------------------------------------------
// Category admin actions
// -----------------------------------------------------------------------

/** Get all categories with post counts (admin). */
export async function getAdminBlogCategories(): Promise<ActionResult<BlogCategoryWithCount[]>> {
  try {
    await requireAdmin();
    const categories = await db.blogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return { success: true, data: categories };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลหมวดหมู่ได้" };
  }
}

/** Create a new blog category. */
export async function createBlogCategory(
  input: z.input<typeof CreateCategorySchema>
): Promise<ActionResult<BlogCategory>> {
  try {
    const session = await requireAdmin();
    const data = CreateCategorySchema.parse(input);

    const category = await db.blogCategory.create({ data });
    logAdminAction(session, "BLOG_CATEGORY_CREATE", "BlogCategory", category.id, { name: data.name });
    revalidateBlogPaths();
    return { success: true, data: category };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "slug นี้ถูกใช้งานแล้ว" };
    }
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถสร้างหมวดหมู่ได้" };
  }
}

/** Update a blog category. */
export async function updateBlogCategory(
  id: string,
  input: z.input<typeof UpdateCategorySchema>
): Promise<ActionResult<BlogCategory>> {
  try {
    const session = await requireAdmin();
    const data = UpdateCategorySchema.parse(input);

    const category = await db.blogCategory.update({ where: { id }, data });
    logAdminAction(session, "BLOG_CATEGORY_UPDATE", "BlogCategory", id, data);
    revalidateBlogPaths();
    return { success: true, data: category };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { success: false, error: "slug นี้ถูกใช้งานแล้ว" };
    }
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตหมวดหมู่ได้" };
  }
}

/** Delete a blog category. Fails if posts reference it. */
export async function deleteBlogCategory(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();

    // Check if any posts use this category
    const count = await db.blogPostCategory.count({ where: { categoryId: id } });
    if (count > 0) {
      return { success: false, error: `ไม่สามารถลบได้ มี ${count} บทความอยู่ในหมวดหมู่นี้` };
    }

    await db.blogCategory.delete({ where: { id } });
    logAdminAction(session, "BLOG_CATEGORY_DELETE", "BlogCategory", id);
    revalidateBlogPaths();
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "ไม่สามารถลบหมวดหมู่ได้" };
  }
}
