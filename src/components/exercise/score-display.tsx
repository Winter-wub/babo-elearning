"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExerciseResult } from "@/types/exercise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreDisplayProps {
  result: ExerciseResult;
  exerciseType: "PRE_TEST" | "POST_TEST" | "STANDALONE";
  onPrimaryAction: () => void;
  onRetake: () => void;
  primaryActionLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScoreDisplay({
  result,
  exerciseType,
  onPrimaryAction,
  onRetake,
  primaryActionLabel,
}: ScoreDisplayProps) {
  const isPassed = result.passed;

  return (
    <Card>
      <CardContent className="pt-8 pb-4">
        {/* Score header */}
        <div className="text-center space-y-4">
          <Badge variant={exerciseType === "PRE_TEST" ? "outline" : "default"}>
            {exerciseType === "PRE_TEST" ? "ผลแบบทดสอบก่อนเรียน" : exerciseType === "STANDALONE" ? "ผลแบบทดสอบวัดระดับ" : "ผลแบบทดสอบหลังเรียน"}
          </Badge>

          {/* Score circle */}
          <div
            className={cn(
              "mx-auto flex h-32 w-32 flex-col items-center justify-center rounded-full",
              isPassed
                ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800"
                : "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800"
            )}
          >
            <span
              className={cn(
                "text-4xl font-extrabold tabular-nums",
                isPassed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
              )}
            >
              {result.earnedPoints}
            </span>
            <span className="text-xs text-muted-foreground">จาก {result.totalPoints}</span>
          </div>

          {/* Percentage */}
          <div>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                isPassed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
              )}
            >
              {result.score}%
            </p>
            <Badge
              variant={isPassed ? "default" : "destructive"}
              className="mt-2"
            >
              {isPassed ? "✓ ผ่าน" : "ไม่ผ่านเกณฑ์"}
            </Badge>
          </div>
        </div>

        {/* Question review */}
        <div className="mt-8">
          <h3 className="mb-3 font-semibold">ทบทวนคำตอบ</h3>
          <div className="divide-y rounded-lg border">
            {result.answers.map((ans, i) => (
              <div key={ans.questionId} className="flex gap-3 p-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    ans.isCorrect === true
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : ans.isCorrect === false
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {ans.isCorrect === true ? "✓" : ans.isCorrect === false ? "✗" : "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {i + 1}. {ans.questionText}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    คำตอบของคุณ:{" "}
                    {ans.isCorrect === true ? (
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatAnswer(ans.answer)}
                      </span>
                    ) : ans.isCorrect === false ? (
                      <>
                        <span className="font-semibold text-red-600 line-through dark:text-red-400">
                          {formatAnswer(ans.answer)}
                        </span>
                        {ans.correctAnswer !== null && (
                          <>
                            {" · เฉลย: "}
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatAnswer(ans.correctAnswer)}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <span>{formatAnswer(ans.answer)}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center gap-3 border-t pt-4">
        <Button variant="outline" onClick={onRetake}>
          ทำอีกครั้ง
        </Button>
        <Button onClick={onPrimaryAction}>
          {primaryActionLabel ?? (exerciseType === "PRE_TEST" ? "ดูวิดีโอ →" : exerciseType === "STANDALONE" ? "ดูคอร์สเรียน →" : "ดูวิดีโอต่อ →")}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAnswer(val: unknown): string {
  if (val === null || val === undefined) return "ไม่ได้ตอบ";
  if (typeof val === "boolean") return val ? "True" : "False";
  if (typeof val === "string") return val || "ไม่ได้ตอบ";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") {
    return Object.values(val as Record<string, string>)
      .filter(Boolean)
      .join(", ") || "ไม่ได้ตอบ";
  }
  return String(val);
}
