"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ContactSubmission } from "@prisma/client";
import type { ActionResult, PaginatedResult } from "@/types";

const contactSchema = z.object({
  name: z.string().min(1, "จำเป็นต้องระบุชื่อ"),
  email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
  subject: z.string().min(1, "จำเป็นต้องระบุหัวข้อ"),
  message: z.string().min(10, "ข้อความต้องมีอย่างน้อย 10 ตัวอักษร"),
});

export type ContactFormState = ActionResult<{ id: string }> | null;

/**
 * Validates and persists a contact form submission.
 */
export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    tenantSlug: formData.get("tenantSlug"),
  };

  const parsed = contactSchema.safeParse(raw);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return { success: false, error: firstError };
  }

  try {
    const tenant = await db.tenant.findUnique({
      where: { slug: raw.tenantSlug as string },
      select: { id: true }
    });

    if (!tenant) {
      return { success: false, error: "ไม่พบผู้เช่า" };
    }

    const submission = await db.contactSubmission.create({
      data: {
        ...parsed.data,
        tenantId: tenant.id
      },
    });

    return { success: true, data: { id: submission.id } };
  } catch {
    return {
      success: false,
      error: "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง",
    };
  }
}

// -----------------------------------------------------------------------
// Admin helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

/** Get paginated contact submissions (admin). */
export async function getContactSubmissions(
  page: number = 1,
  pageSize: number = 20,
  filter?: "all" | "read" | "unread"
): Promise<ActionResult<PaginatedResult<ContactSubmission>>> {
  try {
    const session = await requireAdmin();

    const where =
      filter === "read"
        ? { isRead: true, tenantId: session.user.activeTenantId! }
        : filter === "unread"
        ? { isRead: false, tenantId: session.user.activeTenantId! }
        : { tenantId: session.user.activeTenantId! };

    const [items, total] = await Promise.all([
      db.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contactSubmission.count({ where }),
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
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลข้อความที่ส่งมาได้",
    };
  }
}

/** Mark a submission as read. */
export async function markSubmissionRead(
  id: string,
  isRead: boolean = true
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    await db.contactSubmission.update({ where: { id, tenantId: session.user.activeTenantId! }, data: { isRead } });
    revalidatePath("/admin/contacts");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตข้อความได้",
    };
  }
}

/** Delete a submission. */
export async function deleteSubmission(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireAdmin();
    await db.contactSubmission.delete({ where: { id, tenantId: session.user.activeTenantId! } });
    revalidatePath("/admin/contacts");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบข้อความได้",
    };
  }
}
