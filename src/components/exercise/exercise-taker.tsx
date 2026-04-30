"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStudentExercise, submitExercise } from "@/actions/exercise.actions";
import { cn } from "@/lib/utils";
import type { ExerciseForStudent, ExerciseResult } from "@/types/exercise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExerciseTakerProps {
  exerciseId: string;
  exerciseTitle: string;
  exerciseType: "PRE_TEST" | "POST_TEST" | "STANDALONE";
  onComplete: (result: ExerciseResult) => void;
  preloadedExercise?: ExerciseForStudent;
  customSubmit?: (data: { exerciseId: string; answers: Record<string, unknown> }) => Promise<{ success: boolean; data?: ExerciseResult; error?: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExerciseTaker({
  exerciseId,
  exerciseTitle,
  exerciseType,
  onComplete,
  preloadedExercise,
  customSubmit,
}: ExerciseTakerProps) {
  const [exercise, setExercise] = useState<ExerciseForStudent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (preloadedExercise) {
      setExercise(preloadedExercise);
      setLoading(false);
      return;
    }
    getStudentExercise(exerciseId).then((result) => {
      if (result.success) setExercise(result.data);
      setLoading(false);
    });
  }, [exerciseId, preloadedExercise]);

  const setAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setShowConfirm(false);
    setSubmitError(null);
    setSubmitting(true);
    const submitFn = customSubmit ?? submitExercise;
    const result = await submitFn({
      exerciseId,
      answers,
    });
    setSubmitting(false);

    if (result.success && "data" in result && result.data) {
      onComplete(result.data);
    } else {
      setSubmitError("error" in result ? (result.error ?? "เกิดข้อผิดพลาดในการส่งคำตอบ") : "เกิดข้อผิดพลาดในการส่งคำตอบ");
    }
  }, [exerciseId, answers, onComplete, customSubmit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!exercise) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          ไม่พบแบบฝึกหัด
        </CardContent>
      </Card>
    );
  }

  // -- Start screen --
  if (!started) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <Badge variant={exerciseType === "PRE_TEST" ? "outline" : "default"} className="mb-2">
              {exerciseType === "PRE_TEST" ? "แบบทดสอบก่อนเรียน" : exerciseType === "STANDALONE" ? "แบบทดสอบวัดระดับ" : "แบบทดสอบหลังเรียน"}
            </Badge>
          </div>
          <CardTitle>{exerciseTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {exercise.questions.length} ข้อ · คะแนนผ่าน {exercise.passingScore}%
          </p>
        </CardHeader>
        <CardContent className="text-center pb-8">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-lg font-semibold mb-2">พร้อมแล้วหรือยัง?</p>
          <p className="text-sm text-muted-foreground mb-6">
            {exerciseType === "PRE_TEST"
              ? "แบบทดสอบนี้ช่วยประเมินความรู้ก่อนเรียน"
              : exerciseType === "STANDALONE"
                ? "ทดสอบความรู้ภาษาอังกฤษของคุณเพื่อแนะนำคอร์สที่เหมาะสม"
                : "ทำแบบทดสอบหลังเรียนเพื่อวัดความเข้าใจ"}
          </p>
          <Button size="lg" onClick={() => setStarted(true)}>
            เริ่มทำแบบทดสอบ
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = exercise.questions[currentIndex];
  const isLast = currentIndex === exercise.questions.length - 1;
  const config = question.config as Record<string, unknown>;
  const progress = ((currentIndex + 1) / exercise.questions.length) * 100;

  return (
    <>
      <Card>
        {/* Header with progress */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <Badge variant={exerciseType === "PRE_TEST" ? "outline" : "default"} className="text-[10px]">
              {exerciseType === "PRE_TEST" ? "Pre-test" : exerciseType === "STANDALONE" ? "วัดระดับ" : "Post-test"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ข้อ {currentIndex + 1} จาก {exercise.questions.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-8 space-y-6">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {submitError}
            </div>
          )}

          {/* Question text */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">ข้อ {currentIndex + 1}</p>
            <p className="text-lg font-semibold leading-relaxed">{question.text}</p>
          </div>

          {/* Question-specific input */}
          <QuestionInput
            question={question}
            config={config}
            value={answers[question.id]}
            onChange={(val) => setAnswer(question.id, val)}
          />
        </CardContent>

        <CardFooter className="justify-between border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex((i) => i - 1)}
            disabled={currentIndex === 0}
          >
            ← ก่อนหน้า
          </Button>

          {isLast ? (
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "กำลังส่ง..." : "ส่งคำตอบ ✓"}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex((i) => i + 1)}>
              ถัดไป →
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Submit confirmation */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการส่งคำตอบ</DialogTitle>
            <DialogDescription>
              คุณตอบคำถามแล้ว {Object.keys(answers).length} จาก {exercise.questions.length} ข้อ
              {Object.keys(answers).length < exercise.questions.length && (
                <span className="block mt-1 text-amber-600">
                  ยังมีคำถามที่ยังไม่ได้ตอบ ข้อที่ไม่ได้ตอบจะได้ 0 คะแนน
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>
              กลับไปตรวจสอบ
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "กำลังส่ง..." : "ยืนยันส่งคำตอบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Question input renderer
// ---------------------------------------------------------------------------

function QuestionInput({
  question,
  config,
  value,
  onChange,
}: {
  question: ExerciseForStudent["questions"][number];
  config: Record<string, unknown>;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const options = (config.options as { id: string; text: string }[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                value === opt.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/30"
              )}
              onClick={() => onChange(opt.id)}
            >
              <div
                className={cn(
                  "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                  value === opt.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {value === opt.id && (
                  <div className="h-full w-full rounded-full border-2 border-background" />
                )}
              </div>
              <span className="text-sm">{opt.text}</span>
            </button>
          ))}
        </div>
      );
    }

    case "CHECKBOXES": {
      const options = (config.options as { id: string; text: string }[]) ?? [];
      const selected = (value as string[]) ?? [];
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30"
                )}
                onClick={() => {
                  onChange(
                    isSelected
                      ? selected.filter((id) => id !== opt.id)
                      : [...selected, opt.id]
                  );
                }}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isSelected && "✓"}
                </div>
                <span className="text-sm">{opt.text}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case "TRUE_FALSE":
      return (
        <div className="flex gap-3">
          {[
            { val: true, label: "True" },
            { val: false, label: "False" },
          ].map(({ val, label }) => (
            <button
              key={label}
              type="button"
              className={cn(
                "flex-1 rounded-lg border p-4 text-center font-medium transition-colors",
                value === val
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:border-primary/30"
              )}
              onClick={() => onChange(val)}
            >
              {label}
            </button>
          ))}
        </div>
      );

    case "SHORT_ANSWER":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="พิมพ์คำตอบของคุณ..."
          maxLength={(config.maxLength as number) ?? 200}
        />
      );

    case "PARAGRAPH":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="พิมพ์คำตอบของคุณ..."
          maxLength={(config.maxLength as number) ?? 2000}
          className="min-h-[120px]"
        />
      );

    case "LINEAR_SCALE": {
      const min = (config.min as number) ?? 1;
      const max = (config.max as number) ?? 5;
      const minLabel = config.minLabel as string;
      const maxLabel = config.maxLabel as string;
      const dots = Array.from({ length: max - min + 1 }, (_, i) => min + i);

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            {dots.map((n) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  value === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary"
                )}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
          {(minLabel || maxLabel) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      );
    }

    case "MATCHING": {
      const leftItems = (config.leftItems as { id: string; text: string }[]) ?? [];
      const rightItems = (config.rightItems as string[]) ?? [];
      const pairs = (value as Record<string, string>) ?? {};

      return (
        <div className="space-y-3">
          {leftItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border bg-muted/30 p-3 text-sm font-medium">
                {item.text}
              </div>
              <span className="text-muted-foreground">→</span>
              <select
                value={pairs[item.id] ?? ""}
                onChange={(e) => onChange({ ...pairs, [item.id]: e.target.value })}
                className="flex-1 rounded-lg border bg-background p-3 text-sm"
              >
                <option value="">เลือกคำตอบ...</option>
                {rightItems.map((right, idx) => (
                  <option key={idx} value={right}>
                    {right}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case "FILL_IN_BLANK": {
      const blanks = (config.blanks as { id: string }[]) ?? [];
      const filledValues = (value as Record<string, string>) ?? {};

      // Split question text by ___
      const parts = question.text.split(/___/);

      return (
        <div className="text-base leading-[2.5]">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < blanks.length && (
                <input
                  value={filledValues[blanks[i].id] ?? ""}
                  onChange={(e) =>
                    onChange({ ...filledValues, [blanks[i].id]: e.target.value })
                  }
                  placeholder="___"
                  className="mx-1 inline-block w-32 border-b-2 border-primary bg-transparent px-2 py-0.5 text-center text-primary font-medium focus:outline-none focus:border-primary"
                />
              )}
            </span>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-sm text-muted-foreground">Unsupported question type</p>;
  }
}
