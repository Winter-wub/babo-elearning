"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseTaker } from "@/components/exercise/exercise-taker";
import { ScoreDisplay } from "@/components/exercise/score-display";
import { submitExercise } from "@/actions/exercise.actions";
import type { ExerciseResult } from "@/types/exercise";
import { ClipboardCheck, Clock, Target, BookOpen } from "lucide-react";

interface ExamPageProps {
  examId: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number | null;
  questionCount: number;
  attempts: {
    id: string;
    score: number | null;
    passed: boolean | null;
    earnedPoints: number | null;
    totalPoints: number | null;
    completedAt: Date | null;
  }[];
}

type ExamState = "landing" | "taking" | "results";

export function ExamPage({
  examId,
  title,
  description,
  passingScore,
  questionCount,
  maxAttempts,
  attempts,
}: ExamPageProps) {
  const router = useRouter();
  const [state, setState] = useState<ExamState>("landing");
  const [result, setResult] = useState<ExerciseResult | null>(null);

  const attemptsUsed = attempts.length;
  const canRetake = maxAttempts === null || attemptsUsed < maxAttempts;
  const bestScore = attempts.length > 0
    ? Math.max(...attempts.map((a) => a.score ?? 0))
    : null;

  const handleComplete = useCallback((exerciseResult: ExerciseResult) => {
    setResult(exerciseResult);
    setState("results");
  }, []);

  const handleRetake = useCallback(() => {
    setResult(null);
    setState("taking");
  }, []);

  const handleBrowseCourses = useCallback(() => {
    router.push("/playlists");
  }, [router]);

  // -- Landing --
  if (state === "landing") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200">
              <ClipboardCheck className="h-10 w-10 text-violet-600" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Metadata */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <BookOpen className="mx-auto mb-1 h-5 w-5 text-violet-500" />
                <p className="text-lg font-bold text-violet-600">{questionCount}</p>
                <p className="text-xs text-muted-foreground">ข้อ</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Clock className="mx-auto mb-1 h-5 w-5 text-violet-500" />
                <p className="text-lg font-bold text-violet-600">~{Math.ceil(questionCount * 0.5)}</p>
                <p className="text-xs text-muted-foreground">นาที</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Target className="mx-auto mb-1 h-5 w-5 text-violet-500" />
                <p className="text-lg font-bold text-violet-600">{passingScore}%</p>
                <p className="text-xs text-muted-foreground">คะแนนผ่าน</p>
              </div>
            </div>

            {/* Previous attempts */}
            {attempts.length > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-semibold">ประวัติการทำแบบทดสอบ</h3>
                <div className="space-y-2">
                  {attempts.slice(0, 3).map((attempt, i) => (
                    <div key={attempt.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ครั้งที่ {attemptsUsed - i}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{attempt.score}%</span>
                        <Badge variant={attempt.passed ? "default" : "destructive"} className="text-[10px]">
                          {attempt.passed ? "ผ่าน" : "ไม่ผ่าน"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {bestScore !== null && (
                  <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                    คะแนนสูงสุด: <span className="font-semibold text-foreground">{bestScore}%</span>
                  </p>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => setState("taking")}
                disabled={!canRetake}
              >
                {attempts.length > 0 ? "ทำแบบทดสอบอีกครั้ง" : "เริ่มทำแบบทดสอบ"}
              </Button>
              {!canRetake && (
                <p className="text-xs text-muted-foreground">
                  คุณทำแบบทดสอบครบจำนวนสูงสุดแล้ว ({maxAttempts} ครั้ง)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -- Taking --
  if (state === "taking") {
    return (
      <div className="mx-auto max-w-2xl">
        <ExerciseTaker
          exerciseId={examId}
          exerciseTitle={title}
          exerciseType="STANDALONE"
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // -- Results --
  if (state === "results" && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <ScoreDisplay
          result={result}
          exerciseType="STANDALONE"
          onPrimaryAction={handleBrowseCourses}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  return null;
}
