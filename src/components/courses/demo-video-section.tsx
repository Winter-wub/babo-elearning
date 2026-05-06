"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Lock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/video/video-player";
import { ExerciseTaker } from "@/components/exercise/exercise-taker";
import { ScoreDisplay } from "@/components/exercise/score-display";
import type { ExerciseResult } from "@/types/exercise";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemoPreTest {
  exerciseId: string;
  title: string;
}

export interface DemoVideo {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
}

interface DemoVideoSectionProps {
  demoVideo: DemoVideo;
  isAuthenticated: boolean;
  /** If the course has a pre-test linked to the demo, pass it here */
  preTest?: DemoPreTest | null;
  /** LINE URL for the inquire CTA — only shown after watching */
  lineUrl?: string;
  /** Product/playlist slug so the buy CTA can link correctly */
  playlistSlug: string;
}

type DemoState = "preview" | "watching" | "pre-test" | "pre-test-done" | "cta";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A self-contained demo video funnel:
 *   1. Thumbnail preview with play overlay (or locked state for guests)
 *   2. Video player (authenticated users only)
 *   3. Optional pre-test after video
 *   4. Conversion CTA — Buy Course + LINE Inquiry
 *
 * This is a "use client" island; the parent playlist page stays a Server Component.
 */
export function DemoVideoSection({
  demoVideo,
  isAuthenticated,
  preTest,
  lineUrl,
  playlistSlug,
}: DemoVideoSectionProps) {
  const pathname = usePathname();
  const [state, setState] = useState<DemoState>("preview");
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);

  const handlePlayClick = useCallback(() => {
    // Guest users see the register CTA instead — the locked overlay handles this
    if (!isAuthenticated) return;
    setState("watching");
  }, [isAuthenticated]);

  const handleVideoEnded = useCallback(() => {
    if (preTest) {
      setState("pre-test");
    } else {
      setState("cta");
    }
  }, [preTest]);

  const handlePreTestComplete = useCallback((result: ExerciseResult) => {
    setExerciseResult(result);
    setState("pre-test-done");
  }, []);

  const handleRetakePreTest = useCallback(() => {
    setState("pre-test");
    setExerciseResult(null);
  }, []);

  const handleProceedToCta = useCallback(() => {
    setState("cta");
  }, []);

  // ── Preview / Locked overlay ───────────────────────────────────────────────
  if (state === "preview") {
    return (
      <div className="space-y-3">
        {/* Video thumbnail with play/lock overlay */}
        <div
          className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-muted"
          role="button"
          tabIndex={0}
          aria-label={isAuthenticated ? "ดูตัวอย่างวิดีโอ" : "สมัครสมาชิกเพื่อดูตัวอย่าง"}
          onClick={handlePlayClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handlePlayClick();
            }
          }}
        >
          {/* Background thumbnail */}
          {demoVideo.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={demoVideo.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted" />
          )}

          {/* Dark scrim */}
          <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/50" />

          {/* Center badge — "ดูตัวอย่าง" label */}
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
              ดูตัวอย่าง
            </span>
          </div>

          {/* Play / Lock button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-200 group-hover:scale-110">
                  <Play className="h-7 w-7 translate-x-0.5 fill-primary text-primary" aria-hidden="true" />
                </div>
                <p className="rounded-md bg-black/50 px-3 py-1 text-sm font-medium text-white">
                  {demoVideo.title}
                </p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <Lock className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-center text-sm font-semibold text-white">
                  สมัครสมาชิกเพื่อดูตัวอย่าง
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-1 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/register?callbackUrl=${encodeURIComponent(pathname)}`}>สมัครสมาชิกฟรี</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Descriptive label below thumbnail */}
        {isAuthenticated && (
          <p className="text-center text-xs text-muted-foreground">
            คลิกเพื่อชมตัวอย่างวิดีโอก่อนตัดสินใจซื้อ
          </p>
        )}
      </div>
    );
  }

  // ── Video player state ─────────────────────────────────────────────────────
  if (state === "watching") {
    return (
      <div className="space-y-3">
        <VideoPlayer videoId={demoVideo.id} title={demoVideo.title} />

        {/* Hint to complete watching */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-sm text-muted-foreground">
            ดูวิดีโอตัวอย่างให้จบ แล้วทำแบบทดสอบเพื่อประเมินความพร้อม
          </p>
          <button
            onClick={handleVideoEnded}
            className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
          >
            ข้ามไปที่แบบทดสอบ →
          </button>
        </div>
      </div>
    );
  }

  // ── Pre-test state ─────────────────────────────────────────────────────────
  if (state === "pre-test" && preTest) {
    return (
      <div className="space-y-4">
        {/* Small heading above the exercise card */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            แบบทดสอบก่อนเรียน
          </p>
          <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
            ทำแบบทดสอบเพื่อดูว่าคุณเหมาะกับคอร์สนี้หรือไม่
          </p>
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

  // ── Pre-test results state ─────────────────────────────────────────────────
  if (state === "pre-test-done" && exerciseResult) {
    return (
      <div className="space-y-4">
        <ScoreDisplay
          result={exerciseResult}
          exerciseType="PRE_TEST"
          onPrimaryAction={handleProceedToCta}
          onRetake={handleRetakePreTest}
        />
      </div>
    );
  }

  // ── Conversion CTA state ───────────────────────────────────────────────────
  if (state === "cta") {
    return (
      <div className="space-y-4">
        {/* Muted video recap thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {demoVideo.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={demoVideo.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover opacity-60"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 via-muted to-muted" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">🎓</span>
            <p className="text-lg font-bold text-foreground drop-shadow">
              ชอบที่เห็นไหม?
            </p>
            <p className="text-sm text-muted-foreground">
              เรียนเต็มคอร์สและพัฒนาทักษะของคุณ
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="flex-1 gap-2">
            <Link href={`/playlists/${playlistSlug}`}>
              ซื้อคอร์สเรียน
            </Link>
          </Button>

          {lineUrl && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="flex-1 gap-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
            >
              <a href={lineUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                สอบถามเพิ่มเติมทาง LINE
              </a>
            </Button>
          )}
        </div>

        {/* Re-watch link */}
        <p className="text-center text-xs text-muted-foreground">
          <button
            onClick={() => setState("watching")}
            className="underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
          >
            ดูตัวอย่างอีกครั้ง
          </button>
        </p>
      </div>
    );
  }

  return null;
}
