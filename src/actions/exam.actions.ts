"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult } from "@/types";
import {
  CreateStandaloneExamSchema,
  UpdateExerciseSchema,
  type ExerciseWithQuestions,
} from "@/types/exercise";

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
// Admin: Standalone exam CRUD
// -----------------------------------------------------------------------

export async function createStandaloneExam(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = CreateStandaloneExamSchema.parse(input);

    const exercise = await db.exercise.create({
      data: {
        videoId: undefined,
        type: "STANDALONE",
        title: data.title,
        description: data.description,
        passingScore: data.passingScore,
        maxAttempts: data.maxAttempts,
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "EXAM_CREATE", "Exercise", exercise.id, {
      type: "STANDALONE",
      title: data.title,
    });

    revalidatePath("/admin/exams");
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create exam" };
  }
}

export async function getStandaloneExams(): Promise<ActionResult<ExerciseWithQuestions[]>> {
  try {
    await requireAdmin();

    const exams = await db.exercise.findMany({
      where: { type: "STANDALONE" },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: exams };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch exams" };
  }
}

export async function updateStandaloneExam(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = UpdateExerciseSchema.parse(input);

    const existing = await db.exercise.findUnique({
      where: { id: data.exerciseId, type: "STANDALONE" },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "ไม่พบแบบทดสอบ" };

    const exercise = await db.exercise.update({
      where: { id: data.exerciseId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
        ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "EXAM_UPDATE", "Exercise", exercise.id, {
      changes: data,
    });

    revalidatePath("/admin/exams");
    revalidatePath(`/admin/exams/${exercise.id}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update exam" };
  }
}

export async function deleteStandaloneExam(
  examId: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const exercise = await db.exercise.findUnique({
      where: { id: examId, type: "STANDALONE" },
      select: { id: true },
    });
    if (!exercise) return { success: false, error: "ไม่พบแบบทดสอบ" };

    await db.exercise.delete({ where: { id: examId } });

    logAdminAction(session, "EXAM_DELETE", "Exercise", examId, {
      type: "STANDALONE",
    });

    revalidatePath("/admin/exams");
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete exam" };
  }
}

// -----------------------------------------------------------------------
// Public: Get exam metadata (for landing page)
// -----------------------------------------------------------------------

export async function getExamMetadata(examId: string) {
  const exam = await db.exercise.findUnique({
    where: { id: examId, type: "STANDALONE", isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      maxAttempts: true,
      _count: { select: { questions: true } },
    },
  });

  return exam;
}

// -----------------------------------------------------------------------
// Student: Get attempt history for an exam
// -----------------------------------------------------------------------

export async function getExamAttemptHistory(examId: string) {
  const session = await auth();
  if (!session?.user) return [];

  const attempts = await db.exerciseAttempt.findMany({
    where: { exerciseId: examId, userId: session.user.id },
    select: {
      id: true,
      score: true,
      passed: true,
      earnedPoints: true,
      totalPoints: true,
      completedAt: true,
    },
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return attempts;
}
