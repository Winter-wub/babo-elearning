import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import type { PublicVideo } from "./types";

interface TrendingListItemProps {
  rank: number;
  video: PublicVideo;
  isAuthenticated: boolean;
}

export function TrendingListItem({
  rank,
  video,
  isAuthenticated,
}: TrendingListItemProps) {
  // Authenticated users go straight to the video; guests are redirected after login
  const href = isAuthenticated
    ? `/videos/${video.id}`
    : `/login?callbackUrl=${encodeURIComponent(`/videos/${video.id}`)}`;

  return (
    // Full row is clickable — use a block Link wrapping the inner flex layout
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {/* Rank badge */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      {/* Thumbnail — fixed width, 16:9 aspect ratio via padding trick */}
      <div className="relative w-20 shrink-0 overflow-hidden rounded">
        {/* aspect-video is 16:9 */}
        <div className="aspect-video w-full bg-muted">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            // Gray fallback div when there is no thumbnail
            <div className="h-full w-full bg-muted" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
          {video.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDuration(video.duration)}
        </p>
      </div>
    </Link>
  );
}
