import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { incrementPlayCount } from "@/actions/video.actions";
import { getPermissionTimeStatus } from "@/lib/permission-utils";
import { VideoPlayerWithPolicy } from "@/components/video/video-player-with-policy";
import { VideoMaterialsSection } from "@/components/video/video-materials-section";
import { Button } from "@/components/ui/button";
import { getMaterialsByVideoId } from "@/actions/material.actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoPageProps {
  params: Promise<{ videoId: string }>;
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;

  const video = await db.video.findUnique({
    where: { id: videoId, isActive: true },
    select: { title: true },
  });

  return {
    title: video?.title ?? "ดูวิดีโอ",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Server component that gates access to the video player behind two checks:
 *   1. The user must be authenticated (middleware should already enforce this,
 *      but we double-check here for defence-in-depth).
 *   2. The user must have an explicit VideoPermission row for this video
 *      (ADMIN users are exempt).
 *
 * If the video does not exist (or is inactive) → notFound() (404).
 * If the student is authenticated but has no permission → redirect to
 *   /unauthorized so they receive a clear "no access" message rather than
 *   silently landing on their dashboard.
 * We intentionally do NOT use notFound() for the permission check — that
 * would reveal whether the video ID exists at all.
 */
export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = await params;

  // ---- 1. Authentication --------------------------------------------------
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // ---- 2. Fetch video (existence + active check) --------------------------
  const video = await db.video.findUnique({
    where: { id: videoId, isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      duration: true,
    },
  });

  if (!video) {
    notFound();
  }

  // ---- 3. Authorisation (with time-based check) ---------------------------
  if (session.user.role === "STUDENT") {
    const permission = await db.videoPermission.findUnique({
      where: {
        userId_videoId: { userId: session.user.id, videoId },
      },
      select: { id: true, validFrom: true, validUntil: true },
    });

    if (!permission) {
      redirect("/unauthorized");
    }

    const timeStatus = getPermissionTimeStatus(permission);
    if (timeStatus === "expired" || timeStatus === "not_yet_active") {
      redirect("/unauthorized");
    }
  }

  // ---- 4. Policy agreement check -----------------------------------------
  const policyAgreement = await db.policyAgreement.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const hasAgreedToPolicy = policyAgreement !== null;

  // ---- 5. Fetch course materials -------------------------------------------
  const materialsResult = await getMaterialsByVideoId(videoId);
  const materials = materialsResult.success ? materialsResult.data : [];

  // ---- 6. Increment play count (fire-and-forget) --------------------------
  // Do not await — we don't want to block rendering on a best-effort counter.
  void incrementPlayCount(videoId);

  // ---- 7. Render ----------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            กลับไปที่แดชบอร์ด
          </Link>
        </Button>
      </div>

      {/* Video player (gated behind policy agreement) */}
      <section aria-label="Video player">
        <VideoPlayerWithPolicy
          videoId={video.id}
          title={video.title}
          hasAgreedServer={hasAgreedToPolicy}
        />
      </section>

      {/* Video metadata */}
      <section aria-label="Video details" className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {video.title}
        </h1>
        {video.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {video.description}
          </p>
        )}
      </section>

      {/* Course materials */}
      <VideoMaterialsSection materials={materials} />
    </div>
  );
}
