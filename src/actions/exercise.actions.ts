"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { ActionResult } from "@/types";
import {
  CreateExerciseSchema,
  UpdateExerciseSchema,
  AddQuestionSchema,
  UpdateQuestionSchema,
  ReorderQuestionsSchema,
  SubmitExerciseSchema,
  getConfigSchema,
  type ExerciseWithQuestions,
  type ExerciseForStudent,
  type ExerciseResult,
  type ChoiceConfig,
  type TrueFalseConfig,
  type ShortAnswerConfig,
  type FillInBlankConfig,
  type MatchingConfig,
  type LinearScaleConfig,
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

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("ไม่มีสิทธิ์");
  return session;
}

// -----------------------------------------------------------------------
// Admin: Exercise CRUD
// -----------------------------------------------------------------------

export async function createExercise(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = CreateExerciseSchema.parse(input);

    // Check video exists
    const video = await db.video.findUnique({ where: { id: data.videoId }, select: { id: true } });
    if (!video) return { success: false, error: "ไม่พบวิดีโอ" };

    // Check duplicate type
    const existing = await db.exercise.findUnique({
      where: { videoId_type: { videoId: data.videoId, type: data.type } },
    });
    if (existing) {
      return { success: false, error: `วิดีโอนี้มี ${data.type === "PRE_TEST" ? "Pre-test" : "Post-test"} อยู่แล้ว` };
    }

    const exercise = await db.exercise.create({
      data: {
        videoId: data.videoId,
        type: data.type,
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

    logAdminAction(session, "EXERCISE_CREATE", "Exercise", exercise.id, {
      videoId: data.videoId,
      type: data.type,
      title: data.title,
    });

    revalidatePath(`/admin/videos/${data.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create exercise" };
  }
}

export async function updateExercise(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = UpdateExerciseSchema.parse(input);

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

    logAdminAction(session, "EXERCISE_UPDATE", "Exercise", exercise.id, {
      changes: data,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update exercise" };
  }
}

export async function deleteExercise(
  exerciseId: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, videoId: true, type: true },
    });
    if (!exercise) return { success: false, error: "ไม่พบแบบฝึกหัด" };

    await db.exercise.delete({ where: { id: exerciseId } });

    logAdminAction(session, "EXERCISE_DELETE", "Exercise", exerciseId, {
      videoId: exercise.videoId,
      type: exercise.type,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete exercise" };
  }
}

// -----------------------------------------------------------------------
// Admin: Question CRUD
// -----------------------------------------------------------------------

export async function addQuestion(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = AddQuestionSchema.parse(input);

    // Verify exercise exists
    const existingExercise = await db.exercise.findUnique({
      where: { id: data.exerciseId },
      select: { id: true },
    });
    if (!existingExercise) return { success: false, error: "ไม่พบแบบฝึกหัด" };

    // Validate config with type-specific schema
    const configSchema = getConfigSchema(data.type);
    const validatedConfig = configSchema.parse(data.config) as Record<string, unknown>;

    // Get next sortOrder
    const lastQuestion = await db.exerciseQuestion.findFirst({
      where: { exerciseId: data.exerciseId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await db.exerciseQuestion.create({
      data: {
        exerciseId: data.exerciseId,
        type: data.type,
        text: data.text,
        required: data.required,
        points: data.points,
        config: validatedConfig as object,
        sortOrder: (lastQuestion?.sortOrder ?? -1) + 1,
      },
    });

    const exercise = await db.exercise.findUniqueOrThrow({
      where: { id: data.exerciseId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "QUESTION_CREATE", "ExerciseQuestion", exercise.id, {
      exerciseId: data.exerciseId,
      type: data.type,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to add question" };
  }
}

export async function updateQuestion(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = UpdateQuestionSchema.parse(input);

    const question = await db.exerciseQuestion.findUnique({
      where: { id: data.questionId },
      select: { exerciseId: true, type: true },
    });
    if (!question) return { success: false, error: "ไม่พบคำถาม" };

    let validatedConfig: object | undefined = undefined;
    if (data.config) {
      const configSchema = getConfigSchema(question.type);
      validatedConfig = configSchema.parse(data.config) as object;
    }

    await db.exerciseQuestion.update({
      where: { id: data.questionId },
      data: {
        ...(data.text !== undefined && { text: data.text }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.points !== undefined && { points: data.points }),
        ...(validatedConfig !== undefined && { config: validatedConfig }),
      },
    });

    const exercise = await db.exercise.findUniqueOrThrow({
      where: { id: question.exerciseId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "QUESTION_UPDATE", "ExerciseQuestion", data.questionId, {
      exerciseId: question.exerciseId,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update question" };
  }
}

export async function deleteQuestion(
  questionId: string
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();

    const question = await db.exerciseQuestion.findUnique({
      where: { id: questionId },
      select: { exerciseId: true },
    });
    if (!question) return { success: false, error: "ไม่พบคำถาม" };

    await db.exerciseQuestion.delete({ where: { id: questionId } });

    const exercise = await db.exercise.findUniqueOrThrow({
      where: { id: question.exerciseId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "QUESTION_DELETE", "ExerciseQuestion", questionId, {
      exerciseId: question.exerciseId,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete question" };
  }
}

export async function reorderQuestions(
  input: unknown
): Promise<ActionResult<ExerciseWithQuestions>> {
  try {
    const session = await requireAdmin();
    const data = ReorderQuestionsSchema.parse(input);

    // Verify all questionIds belong to this exercise
    const existingQuestions = await db.exerciseQuestion.findMany({
      where: { exerciseId: data.exerciseId },
      select: { id: true },
    });
    const existingIds = new Set(existingQuestions.map((q) => q.id));
    const inputIds = new Set(data.questionIds);

    if (existingIds.size !== inputIds.size || ![...existingIds].every((id) => inputIds.has(id))) {
      return { success: false, error: "Question IDs do not match the exercise" };
    }

    await db.$transaction(
      data.questionIds.map((id, index) =>
        db.exerciseQuestion.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    const exercise = await db.exercise.findUniqueOrThrow({
      where: { id: data.exerciseId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    logAdminAction(session, "QUESTION_REORDER", "Exercise", data.exerciseId, {
      questionIds: data.questionIds,
    });

    revalidatePath(`/admin/videos/${exercise.videoId}`);
    return { success: true, data: exercise };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder questions" };
  }
}

// -----------------------------------------------------------------------
// Admin: Get exercises for a video
// -----------------------------------------------------------------------

export async function getExercisesForVideo(
  videoId: string
): Promise<ActionResult<ExerciseWithQuestions[]>> {
  try {
    await requireAdmin();

    const exercises = await db.exercise.findMany({
      where: { videoId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
      orderBy: { type: "asc" },
    });

    return { success: true, data: exercises };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch exercises" };
  }
}

// -----------------------------------------------------------------------
// Student: Get exercise for taking (strips correct answers)
// -----------------------------------------------------------------------

export async function getStudentExercise(
  exerciseId: string
): Promise<ActionResult<ExerciseForStudent>> {
  try {
    const session = await requireAuth();

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId, isActive: true },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!exercise) return { success: false, error: "ไม่พบแบบฝึกหัด" };

    // Verify the student has access to this video
    const permission = await db.videoPermission.findUnique({
      where: { userId_videoId: { userId: session.user.id, videoId: exercise.videoId } },
      select: { id: true },
    });
    if (!permission) return { success: false, error: "ไม่มีสิทธิ์เข้าถึงวิดีโอนี้" };

    // Strip correct answers from config for student view
    const safeQuestions = exercise.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      required: q.required,
      points: q.points,
      sortOrder: q.sortOrder,
      config: stripCorrectAnswers(q.type, q.config as Record<string, unknown>) as ExerciseForStudent["questions"][number]["config"],
    }));

    return {
      success: true,
      data: {
        id: exercise.id,
        type: exercise.type,
        title: exercise.title,
        description: exercise.description,
        passingScore: exercise.passingScore,
        questions: safeQuestions,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch exercise" };
  }
}

/** Strip correct answer info from config so students can't cheat */
function stripCorrectAnswers(type: string, config: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      return {
        options: c.options.map((o) => ({ id: o.id, text: o.text })),
        shuffleOptions: c.shuffleOptions,
      };
    }
    case "TRUE_FALSE":
      return {}; // hide correct answer
    case "SHORT_ANSWER":
      return { maxLength: (config as unknown as ShortAnswerConfig).maxLength };
    case "PARAGRAPH":
      return { maxLength: (config as unknown as { maxLength: number }).maxLength };
    case "LINEAR_SCALE": {
      const c = config as unknown as LinearScaleConfig;
      return { min: c.min, max: c.max, minLabel: c.minLabel, maxLabel: c.maxLabel };
    }
    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      // Give left items, Fisher-Yates shuffle right items
      const rights = c.pairs.map((p) => p.right);
      for (let i = rights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rights[i], rights[j]] = [rights[j], rights[i]];
      }
      return {
        leftItems: c.pairs.map((p) => ({ id: p.id, text: p.left })),
        rightItems: rights,
      };
    }
    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      return { blanks: c.blanks.map((b) => ({ id: b.id })) };
    }
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// Student: Get video exercise status (for gating)
// -----------------------------------------------------------------------

export async function getVideoExerciseStatus(
  videoId: string
): Promise<
  ActionResult<{
    preTest: { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null;
    postTest: { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null;
  }>
> {
  try {
    const session = await requireAuth();

    const exercises = await db.exercise.findMany({
      where: { videoId, isActive: true },
      select: {
        id: true,
        type: true,
        title: true,
        attempts: {
          where: { userId: session.user.id },
          select: { passed: true, score: true },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    const result = {
      preTest: null as { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null,
      postTest: null as { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null,
    };

    for (const ex of exercises) {
      const attempted = ex.attempts.length > 0;
      const passed = ex.attempts.some((a) => a.passed === true);
      const info = { exerciseId: ex.id, title: ex.title, passed, attempted };

      if (ex.type === "PRE_TEST") result.preTest = info;
      if (ex.type === "POST_TEST") result.postTest = info;
    }

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch exercise status" };
  }
}

// -----------------------------------------------------------------------
// Student: Submit exercise
// -----------------------------------------------------------------------

export async function submitExercise(
  input: unknown
): Promise<ActionResult<ExerciseResult>> {
  try {
    const session = await requireAuth();
    const data = SubmitExerciseSchema.parse(input);

    const exercise = await db.exercise.findUnique({
      where: { id: data.exerciseId, isActive: true },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    if (!exercise) return { success: false, error: "ไม่พบแบบฝึกหัด" };

    // Verify video access permission
    const permission = await db.videoPermission.findUnique({
      where: { userId_videoId: { userId: session.user.id, videoId: exercise.videoId } },
      select: { id: true },
    });
    if (!permission) return { success: false, error: "ไม่มีสิทธิ์เข้าถึงวิดีโอนี้" };

    // Grade each question
    let totalPoints = 0;
    let earnedPoints = 0;
    const answerRecords: {
      questionId: string;
      answer: unknown;
      isCorrect: boolean | null;
      pointsAwarded: number;
    }[] = [];

    for (const question of exercise.questions) {
      const studentAnswer = data.answers[question.id];
      totalPoints += question.points;

      const { correct, points } = gradeAnswer(
        question.type,
        question.config as Record<string, unknown>,
        studentAnswer,
        question.points
      );

      earnedPoints += points;
      answerRecords.push({
        questionId: question.id,
        answer: studentAnswer ?? null,
        isCorrect: correct,
        pointsAwarded: points,
      });
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= exercise.passingScore;

    // Atomic attempt limit check + create in a serializable transaction
    const attempt = await db.$transaction(async (tx) => {
      if (exercise.maxAttempts != null) {
        const attemptCount = await tx.exerciseAttempt.count({
          where: { exerciseId: data.exerciseId, userId: session.user.id },
        });
        if (attemptCount >= exercise.maxAttempts) {
          throw new Error(`คุณทำแบบทดสอบนี้ครบจำนวนสูงสุดแล้ว (${exercise.maxAttempts} ครั้ง)`);
        }
      }

      return tx.exerciseAttempt.create({
        data: {
          exerciseId: data.exerciseId,
          userId: session.user.id,
          score,
          totalPoints,
          earnedPoints,
          passed,
          completedAt: new Date(),
          answers: {
            create: answerRecords.map((a) => ({
              questionId: a.questionId,
              answer: a.answer as never,
              isCorrect: a.isCorrect,
              pointsAwarded: a.pointsAwarded,
            })),
          },
        },
        include: {
          answers: {
            include: { question: { select: { text: true, type: true, config: true } } },
          },
        },
      });
    }, { isolationLevel: "Serializable" });

    // Build result — only reveal correct answers for PRE_TEST or if the student passed
    const showCorrectAnswers = exercise.type === "PRE_TEST" || passed;
    const resultAnswers = attempt.answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.text,
      questionType: a.question.type,
      answer: a.answer,
      isCorrect: a.isCorrect,
      pointsAwarded: a.pointsAwarded,
      correctAnswer: showCorrectAnswers
        ? getCorrectAnswer(a.question.type, a.question.config as Record<string, unknown>)
        : null,
    }));

    revalidatePath(`/videos/${exercise.videoId}`);

    return {
      success: true,
      data: {
        attemptId: attempt.id,
        score,
        totalPoints,
        earnedPoints,
        passed,
        answers: resultAnswers,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to submit exercise" };
  }
}

// -----------------------------------------------------------------------
// Grading logic
// -----------------------------------------------------------------------

function gradeAnswer(
  type: string,
  config: Record<string, unknown>,
  answer: unknown,
  maxPoints: number
): { correct: boolean | null; points: number } {
  if (answer === undefined || answer === null || answer === "") {
    return { correct: false, points: 0 };
  }

  switch (type) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      const correctOption = c.options.find((o) => o.isCorrect);
      const isCorrect = correctOption?.id === answer;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "CHECKBOXES": {
      const c = config as unknown as ChoiceConfig;
      const correctIds = new Set(c.options.filter((o) => o.isCorrect).map((o) => o.id));
      const selectedIds = new Set(answer as string[]);
      const isCorrect =
        correctIds.size === selectedIds.size &&
        [...correctIds].every((id) => selectedIds.has(id));
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "TRUE_FALSE": {
      const c = config as unknown as TrueFalseConfig;
      const isCorrect = c.correctAnswer === answer;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "SHORT_ANSWER": {
      const c = config as unknown as ShortAnswerConfig;
      const studentStr = String(answer);
      const isCorrect = c.correctAnswers.some((a) =>
        c.caseSensitive ? a === studentStr : a.toLowerCase() === studentStr.toLowerCase()
      );
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      const studentAnswers = answer as Record<string, string>;
      let allCorrect = true;

      for (const blank of c.blanks) {
        const studentStr = studentAnswers[blank.id] ?? "";
        const matches = blank.acceptedAnswers.some((a) =>
          blank.caseSensitive ? a === studentStr : a.toLowerCase() === studentStr.toLowerCase()
        );
        if (!matches) allCorrect = false;
      }

      return { correct: allCorrect, points: allCorrect ? maxPoints : 0 };
    }

    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      const studentPairs = answer as Record<string, string>;
      let allCorrect = true;

      for (const pair of c.pairs) {
        if (studentPairs[pair.id] !== pair.right) {
          allCorrect = false;
          break;
        }
      }

      return { correct: allCorrect, points: allCorrect ? maxPoints : 0 };
    }

    case "LINEAR_SCALE": {
      const c = config as unknown as LinearScaleConfig;
      if (c.correctValue === null) {
        // Survey-style — no correct answer, always award points
        return { correct: null, points: 0 };
      }
      const isCorrect = Number(answer) === c.correctValue;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "PARAGRAPH": {
      // Manual grading — mark as pending
      return { correct: null, points: 0 };
    }

    default:
      return { correct: null, points: 0 };
  }
}

function getCorrectAnswer(type: string, config: Record<string, unknown>): unknown {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      const correct = c.options.find((o) => o.isCorrect);
      return correct?.text ?? null;
    }
    case "CHECKBOXES": {
      const c = config as unknown as ChoiceConfig;
      return c.options.filter((o) => o.isCorrect).map((o) => o.text);
    }
    case "TRUE_FALSE":
      return (config as unknown as TrueFalseConfig).correctAnswer;
    case "SHORT_ANSWER":
      return (config as unknown as ShortAnswerConfig).correctAnswers;
    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      return c.blanks.map((b) => b.acceptedAnswers[0]);
    }
    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      return Object.fromEntries(c.pairs.map((p) => [p.left, p.right]));
    }
    case "LINEAR_SCALE":
      return (config as unknown as LinearScaleConfig).correctValue;
    case "PARAGRAPH":
      return null; // manual grading
    default:
      return null;
  }
}
