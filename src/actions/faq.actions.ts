"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Faq } from "@prisma/client";
import type { ActionResult } from "@/types";

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

const CreateFaqSchema = z.object({
  question: z.string().min(1, "จำเป็นต้องระบุคำถาม").max(500),
  answer: z.string().min(1, "จำเป็นต้องระบุคำตอบ").max(5000),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

const UpdateFaqSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(5000).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------
// Public actions
// -----------------------------------------------------------------------

/**
 * Fetch all active FAQs, ordered by sortOrder ascending.
 * Used on the public /faq page.
 */
export async function getActiveFaqs(): Promise<Faq[]> {
  return db.faq.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// -----------------------------------------------------------------------
// Admin actions
// -----------------------------------------------------------------------

/** Get all FAQs (admin). Optionally include inactive. */
export async function getFaqs(
  includeInactive: boolean = true
): Promise<ActionResult<Faq[]>> {
  try {
    await requireAdmin();
    const where = includeInactive ? {} : { isActive: true };
    const faqs = await db.faq.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
    return { success: true, data: faqs };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลคำถามที่พบบ่อยได้",
    };
  }
}

/** Create a new FAQ. */
export async function createFaq(
  input: z.input<typeof CreateFaqSchema>
): Promise<ActionResult<Faq>> {
  try {
    await requireAdmin();
    const data = CreateFaqSchema.parse(input);
    const faq = await db.faq.create({ data });
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { success: true, data: faq };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถสร้างคำถามที่พบบ่อยได้",
    };
  }
}

/** Update an existing FAQ. */
export async function updateFaq(
  id: string,
  input: z.input<typeof UpdateFaqSchema>
): Promise<ActionResult<Faq>> {
  try {
    await requireAdmin();
    const data = UpdateFaqSchema.parse(input);
    const faq = await db.faq.update({ where: { id }, data });
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { success: true, data: faq };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตคำถามที่พบบ่อยได้",
    };
  }
}

/** Delete a FAQ. */
export async function deleteFaq(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();
    await db.faq.delete({ where: { id } });
    revalidatePath("/admin/faq");
    revalidatePath("/faq");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "ไม่สามารถลบคำถามที่พบบ่อยได้",
    };
  }
}
