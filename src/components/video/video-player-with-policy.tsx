"use client";

import { useState } from "react";
import { VideoPlayer } from "@/components/video/video-player";
import { PolicyAgreementModal } from "@/components/policy/policy-agreement-modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoPlayerWithPolicyProps {
  videoId: string;
  title?: string;
  /** Server-side pre-check: whether the user has already accepted the policy. */
  hasAgreedServer: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Combines the policy agreement gate with the video player.
 *
 * If the user has already accepted the policy (determined server-side), the
 * video player renders immediately. Otherwise, the non-dismissable policy
 * modal is shown overlaying a blurred/placeholder player area, and the video
 * player is only rendered after the user accepts.
 */
export function VideoPlayerWithPolicy({
  videoId,
  title,
  hasAgreedServer,
}: VideoPlayerWithPolicyProps) {
  const [hasAgreed, setHasAgreed] = useState(hasAgreedServer);

  if (hasAgreed) {
    return <VideoPlayer videoId={videoId} title={title} />;
  }

  return (
    <>
      {/* Placeholder area that mimics the player dimensions while the modal is up */}
      <div
        className="relative w-full overflow-hidden rounded-lg bg-black/90"
        style={{ aspectRatio: "16 / 9" }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-white/40 select-none">
            Accept the Terms of Use to watch this video
          </p>
        </div>
      </div>

      {/* Non-dismissable policy gate */}
      <PolicyAgreementModal onAccepted={() => setHasAgreed(true)} />
    </>
  );
}
