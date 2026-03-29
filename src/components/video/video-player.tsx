"use client";

import { useRef, useCallback, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Key codes that common screen-capture tools rely on — we intercept these as a
// best-effort deterrent.  Note: this cannot prevent all capture methods.
// ---------------------------------------------------------------------------
const BLOCKED_KEY_COMBOS: Array<{
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}> = [
  // Windows: Print Screen
  { key: "PrintScreen" },
  // macOS: Cmd+Shift+3 / Cmd+Shift+4 / Cmd+Shift+5 / Cmd+Shift+6
  { key: "3", metaKey: true, shiftKey: true },
  { key: "4", metaKey: true, shiftKey: true },
  { key: "5", metaKey: true, shiftKey: true },
  { key: "6", metaKey: true, shiftKey: true },
];

function isBlockedCombo(e: KeyboardEvent): boolean {
  return BLOCKED_KEY_COMBOS.some((combo) => {
    if (combo.key !== e.key) return false;
    if (combo.ctrlKey !== undefined && combo.ctrlKey !== e.ctrlKey) return false;
    if (combo.metaKey !== undefined && combo.metaKey !== e.metaKey) return false;
    if (combo.shiftKey !== undefined && combo.shiftKey !== e.shiftKey) return false;
    if (combo.altKey !== undefined && combo.altKey !== e.altKey) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Secure video player that:
 * - Fetches a short-lived signed R2 URL via `useSignedUrl` and auto-refreshes it.
 * - Disables right-click, drag, and keyboard screen-capture shortcuts.
 * - Removes the download control and remote-playback button from the native UI.
 * - Maintains a responsive 16:9 aspect ratio.
 */
export function VideoPlayer({ videoId, title, className }: VideoPlayerProps) {
  const { url, isLoading, error, refresh } = useSignedUrl(videoId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ----- Keyboard deterrent ------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isBlockedCombo(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  // ----- Prevent drag-to-save on the video element -------------------------
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // ----- Disable right-click context menu ----------------------------------
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // ----- Loading state -----------------------------------------------------
  if (isLoading) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-black",
          className
        )}
        style={{ aspectRatio: "16 / 9" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="xl" className="text-white/60" />
        </div>
      </div>
    );
  }

  // ----- Error state -------------------------------------------------------
  if (error) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-black",
          className
        )}
        style={{ aspectRatio: "16 / 9" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-white/70">
            Unable to load video. {error}
          </p>
          <button
            onClick={refresh}
            className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ----- Player ------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-black",
        className
      )}
      style={{
        aspectRatio: "16 / 9",
        // CSS-level deterrents: prevent text/element selection and drag.
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      {url && (
        <video
          ref={videoRef}
          key={url} // Force React to remount the element when the URL rotates,
                    // which also causes the browser to re-request the stream with
                    // the new signed URL without visible interruption.
          src={url}
          controls
          playsInline
          // Remove download button and remote-playback (AirPlay / Cast) UI.
          // Keep fullscreen because that is a legitimate viewing mode.
          controlsList="nodownload noremoteplayback"
          // Disable Picture-in-Picture so the stream cannot be detached.
          disablePictureInPicture
          // Prevent the browser from requesting the resource as a download.
          preload="metadata"
          className="absolute inset-0 h-full w-full"
          aria-label={title ?? "Video player"}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          // Disable the built-in remote-playback interface (Chrome / Edge).
          disableRemotePlayback
        />
      )}
    </div>
  );
}
