import Link from "next/link";
import { PlayCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Video } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoCardProps {
  video: Video;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact card that represents a single video in a grid.
 * Links to `/videos/[videoId]` for student playback.
 * Renders a placeholder thumbnail with an accessible play icon.
 */
export function VideoCard({ video, className }: VideoCardProps) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className={cn("group block focus:outline-none", className)}
      aria-label={`Watch ${video.title}`}
    >
      <Card className="overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        {/* Thumbnail area */}
        <div
          className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900"
          style={{ aspectRatio: "16 / 9" }}
        >
          {video.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayCircle className="h-12 w-12 text-white/30" aria-hidden="true" />
            </div>
          )}

          {/* Play overlay on hover */}
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden="true"
          >
            <PlayCircle className="h-14 w-14 text-white drop-shadow-lg" />
          </div>

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        </div>

        {/* Card body */}
        <CardContent className="p-3">
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug text-foreground"
            title={video.title}
          >
            {video.title}
          </h3>
          {video.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {video.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
