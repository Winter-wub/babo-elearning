"use client";

import { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/video/video-player";
import { PolicyAgreementModal } from "@/components/policy/policy-agreement-modal";
import { ExerciseTaker } from "@/components/exercise/exercise-taker";
import { ScoreDisplay } from "@/components/exercise/score-display";
import type { ExerciseResult } from "@/types/exercise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GateState = "pre-test" | "watching" | "post-test" | "done";

interface ExerciseGateProps {
  videoId: string;
  title: string;
  hasAgreedServer: boolean;
  preTest: { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null;
  postTest: { exerciseId: string; title: string; passed: boolean; attempted: boolean } | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * State machine that gates video playback behind pre-test / post-test exercises.
 *
 * States:
 *   pre-test   → show ExerciseTaker (pre-test)
 *   watching   → show VideoPlayer
 *   post-test  → show ExerciseTaker (post-test)
 *   done       → show ScoreDisplay + replay option
 */
export function ExerciseGate({
  videoId,
  title,
  hasAgreedServer,
  preTest,
  postTest,
}: ExerciseGateProps) {
  // Determine initial state
  const getInitialState = (): GateState => {
    if (preTest && !preTest.attempted) return "pre-test";
    return "watching";
  };

  const [state, setState] = useState<GateState>(getInitialState);
  const [hasAgreed, setHasAgreed] = useState(hasAgreedServer);
  const [lastResult, setLastResult] = useState<ExerciseResult | null>(null);
  const [lastExerciseType, setLastExerciseType] = useState<"PRE_TEST" | "POST_TEST">("PRE_TEST");
  // Track post-test pass in local state so it updates after submission
  const [postTestPassed, setPostTestPassed] = useState(postTest?.passed ?? false);

  const handlePreTestComplete = useCallback((result: ExerciseResult) => {
    setLastResult(result);
    setLastExerciseType("PRE_TEST");
    // Pre-test is diagnostic — always proceed to watching
    setState("done");
  }, []);

  const handlePostTestComplete = useCallback((result: ExerciseResult) => {
    setLastResult(result);
    setLastExerciseType("POST_TEST");
    if (result.passed) setPostTestPassed(true);
    setState("done");
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (postTest && !postTestPassed) {
      setState("post-test");
    }
  }, [postTest, postTestPassed]);

  const handleContinueWatching = useCallback(() => {
    setState("watching");
    setLastResult(null);
  }, []);

  // -- pre-test state --
  if (state === "pre-test" && preTest) {
    return (
      <div className="space-y-4">
        {/* Locked video placeholder */}
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black/90"
          style={{ aspectRatio: "16 / 9" }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🔒</span>
            <p className="text-sm font-semibold text-white/80">
              ทำแบบทดสอบก่อนเรียนเพื่อดูวิดีโอ
            </p>
            <p className="text-xs text-white/50">
              {title}
            </p>
          </div>
        </div>

        <ExerciseTaker
          exerciseId={preTest.exerciseId}
          exerciseTitle={preTest.title}
          exerciseType="PRE_TEST"
          onComplete={handlePreTestComplete}
        />
      </div>
    );
  }

  // -- watching state --
  if (state === "watching") {
    if (!hasAgreed) {
      return (
        <>
          <div
            className="relative w-full overflow-hidden rounded-lg bg-black/90"
            style={{ aspectRatio: "16 / 9" }}
            aria-hidden="true"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/40 select-none">
                ยอมรับข้อตกลงการใช้งานเพื่อรับชมวิดีโอ
              </p>
            </div>
          </div>
          <PolicyAgreementModal onAccepted={() => setHasAgreed(true)} />
        </>
      );
    }

    const hasUnfinishedPostTest = !!postTest && !postTestPassed;

    return (
      <div className="space-y-3">
        <VideoPlayer videoId={videoId} title={title} />

        {hasUnfinishedPostTest && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              เมื่อดูวิดีโอจบแล้ว กรุณาทำแบบทดสอบหลังเรียน
            </p>
            <button
              onClick={handleVideoEnded}
              className="mt-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              เริ่มทำแบบทดสอบหลังเรียน
            </button>
          </div>
        )}
      </div>
    );
  }

  // -- post-test state --
  if (state === "post-test" && postTest) {
    return (
      <ExerciseTaker
        exerciseId={postTest.exerciseId}
        exerciseTitle={postTest.title}
        exerciseType="POST_TEST"
        onComplete={handlePostTestComplete}
      />
    );
  }

  // -- done state (show results) --
  if (state === "done" && lastResult) {
    return (
      <ScoreDisplay
        result={lastResult}
        exerciseType={lastExerciseType}
        onContinueWatching={handleContinueWatching}
        onRetake={() => {
          setLastResult(null);
          setState(lastExerciseType === "PRE_TEST" ? "pre-test" : "post-test");
        }}
      />
    );
  }

  // Fallback: show video player
  return (
    <div className="space-y-3">
      <VideoPlayer videoId={videoId} title={title} />
    </div>
  );
}
