import Link from "next/link";
import { Film, Eye, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDuration } from "@/lib/utils";
import type { PublicVideo } from "./types";

interface PublicVideoCardProps {
  video: PublicVideo;
  isAuthenticated: boolean;
}

function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} ${count === 1 ? "view" : "views"}`;
}

export function PublicVideoCard({
  video,
  isAuthenticated,
}: PublicVideoCardProps) {
  const href = isAuthenticated
    ? `/videos/${video.id}`
    : `/login?callbackUrl=${encodeURIComponent(`/videos/${video.id}`)}`;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card className="overflow-hidden transition-shadow duration-200 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Film className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Duration overlay */}
          <span className="absolute bottom-2 right-2 rounded bg-foreground/80 px-1.5 py-0.5 text-xs font-medium text-background">
            {formatDuration(video.duration)}
          </span>

          {/* Featured badge */}
          {video.isFeatured && (
            <Badge className="absolute left-2 top-2 gap-1">
              <Star className="h-3 w-3" />
              Featured
            </Badge>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-4">
          <h3
            className={cn(
              "line-clamp-2 text-sm font-medium leading-snug text-foreground",
              "group-hover:text-primary transition-colors"
            )}
          >
            {video.title}
          </h3>

          {video.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {video.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{formatPlayCount(video.playCount)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
