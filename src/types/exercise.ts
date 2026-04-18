import { z } from "zod";
import type { Exercise, ExerciseQuestion, ExerciseAttempt, StudentAnswer, ExerciseType, QuestionType } from "@prisma/client";

export type { Exercise, ExerciseQuestion, ExerciseAttempt, StudentAnswer, ExerciseType, QuestionType };

// -----------------------------------------------------------------------
// Question config schemas — discriminated by question type
// -----------------------------------------------------------------------

const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text is required"),
  isCorrect: z.boolean(),
});

/** Config for MULTIPLE_CHOICE, CHECKBOXES, DROPDOWN */
export const choiceConfigSchema = z.object({
  options: z.array(optionSchema).min(2, "At least 2 options required").max(10),
  shuffleOptions: z.boolean().default(false),
});

/** Config for SHORT_ANSWER */
export const shortAnswerConfigSchema = z.object({
  correctAnswers: z.array(z.string()).min(1, "At least 1 correct answer required"),
  caseSensitive: z.boolean().default(false),
  maxLength: z.number().int().max(500).default(200),
});

/** Config for PARAGRAPH */
export const paragraphConfigSchema = z.object({
  maxLength: z.number().int().max(5000).default(2000),
  correctKeywords: z.array(z.string()).default([]),
  manualGrading: z.boolean().default(true),
});

/** Config for TRUE_FALSE */
export const trueFalseConfigSchema = z.object({
  correctAnswer: z.boolean(),
});

/** Config for LINEAR_SCALE */
export const linearScaleConfigSchema = z.object({
  min: z.number().int().min(0).max(1),
  max: z.number().int().min(2).max(10),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  correctValue: z.number().nullable().default(null),
});

/** Config for MATCHING */
export const matchingConfigSchema = z.object({
  pairs: z
    .array(
      z.object({
        id: z.string(),
        left: z.string().min(1),
        right: z.string().min(1),
      })
    )
    .min(2, "At least 2 pairs required")
    .max(10),
});

/** Config for FILL_IN_BLANK */
export const fillInBlankConfigSchema = z.object({
  blanks: z
    .array(
      z.object({
        id: z.string(),
        acceptedAnswers: z.array(z.string()).min(1),
        caseSensitive: z.boolean().default(false),
      })
    )
    .min(1, "At least 1 blank required"),
});

// -----------------------------------------------------------------------
// Config resolver — maps QuestionType → correct config schema
// -----------------------------------------------------------------------

export const CONFIG_SCHEMAS: Record<string, z.ZodType> = {
  MULTIPLE_CHOICE: choiceConfigSchema,
  CHECKBOXES: choiceConfigSchema,
  DROPDOWN: choiceConfigSchema,
  SHORT_ANSWER: shortAnswerConfigSchema,
  PARAGRAPH: paragraphConfigSchema,
  TRUE_FALSE: trueFalseConfigSchema,
  LINEAR_SCALE: linearScaleConfigSchema,
  MATCHING: matchingConfigSchema,
  FILL_IN_BLANK: fillInBlankConfigSchema,
};

export function getConfigSchema(type: string): z.ZodType {
  const schema = CONFIG_SCHEMAS[type];
  if (!schema) throw new Error(`Unknown question type: ${type}`);
  return schema;
}

// -----------------------------------------------------------------------
// Inferred config types
// -----------------------------------------------------------------------

export type ChoiceConfig = z.infer<typeof choiceConfigSchema>;
export type ShortAnswerConfig = z.infer<typeof shortAnswerConfigSchema>;
export type ParagraphConfig = z.infer<typeof paragraphConfigSchema>;
export type TrueFalseConfig = z.infer<typeof trueFalseConfigSchema>;
export type LinearScaleConfig = z.infer<typeof linearScaleConfigSchema>;
export type MatchingConfig = z.infer<typeof matchingConfigSchema>;
export type FillInBlankConfig = z.infer<typeof fillInBlankConfigSchema>;

export type QuestionConfig =
  | ChoiceConfig
  | ShortAnswerConfig
  | ParagraphConfig
  | TrueFalseConfig
  | LinearScaleConfig
  | MatchingConfig
  | FillInBlankConfig;

// -----------------------------------------------------------------------
// Server action input schemas
// -----------------------------------------------------------------------

export const CreateExerciseSchema = z.object({
  videoId: z.string().min(1),
  type: z.enum(["PRE_TEST", "POST_TEST"]),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(500).optional(),
  passingScore: z.number().int().min(0).max(100).default(80),
  maxAttempts: z.number().int().min(1).max(100).nullable().default(null),
});

export const UpdateExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const AddQuestionSchema = z.object({
  exerciseId: z.string().min(1),
  type: z.enum([
    "SHORT_ANSWER",
    "PARAGRAPH",
    "MULTIPLE_CHOICE",
    "CHECKBOXES",
    "DROPDOWN",
    "LINEAR_SCALE",
    "MATCHING",
    "TRUE_FALSE",
    "FILL_IN_BLANK",
  ]),
  text: z.string().min(1, "Question text is required"),
  required: z.boolean().default(true),
  points: z.number().int().min(0).max(100).default(1),
  config: z.record(z.string(), z.unknown()), // validated further by type-specific schema
});

export const UpdateQuestionSchema = z.object({
  questionId: z.string().min(1),
  text: z.string().min(1).optional(),
  required: z.boolean().optional(),
  points: z.number().int().min(0).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const ReorderQuestionsSchema = z.object({
  exerciseId: z.string().min(1),
  questionIds: z.array(z.string()),
});

export const SubmitExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  answers: z.record(z.string(), z.unknown()), // questionId → answer value
});

// -----------------------------------------------------------------------
// Composite types for client rendering
// -----------------------------------------------------------------------

export type ExerciseWithQuestions = Exercise & {
  questions: ExerciseQuestion[];
  _count: { attempts: number };
};

export type ExerciseForStudent = {
  id: string;
  type: ExerciseType;
  title: string;
  description: string | null;
  passingScore: number;
  questions: {
    id: string;
    type: QuestionType;
    text: string;
    required: boolean;
    points: number;
    sortOrder: number;
    config: QuestionConfig; // correctAnswer fields stripped for student
  }[];
};

export type ExerciseResult = {
  attemptId: string;
  score: number;
  totalPoints: number;
  earnedPoints: number;
  passed: boolean;
  answers: {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    answer: unknown;
    isCorrect: boolean | null;
    pointsAwarded: number;
    correctAnswer: unknown;
  }[];
};
