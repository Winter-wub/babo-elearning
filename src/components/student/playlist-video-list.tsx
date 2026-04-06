import Link from "next/link";
import { Clock, Play } from "lucide-react";
import type { PlaylistWithVideos } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PlaylistVideoListProps {
  videos: PlaylistWithVideos["videos"];
}

export function PlaylistVideoList({ videos }: PlaylistVideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This playlist has no videos yet.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {videos.map(({ position, video }) => (
        <Link
          key={video.id}
          href={`/videos/${video.id}`}
          className="group flex items-start gap-4 p-4 transition-colors hover:bg-muted/50"
        >
          {/* Position number */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
            {position}
          </div>

          {/* Thumbnail */}
          <div className="relative hidden h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Play className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
              {video.title}
            </h3>
            {video.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {video.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </span>
              {video.playCount > 0 && (
                <span>
                  {video.playCount.toLocaleString()} {video.playCount === 1 ? "view" : "views"}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
