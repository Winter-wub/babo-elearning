import Link from "next/link";
import { ListVideo, PlayCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlaylistWithVideos } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function totalDuration(playlist: PlaylistWithVideos): string {
  const total = playlist.videos.reduce((sum, pv) => sum + pv.video.duration, 0);
  if (total === 0) return "";
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PlaylistBrowseCardProps {
  playlist: PlaylistWithVideos;
}

export function PlaylistBrowseCard({ playlist }: PlaylistBrowseCardProps) {
  const videoCount = playlist.videos.length;
  const duration = totalDuration(playlist);

  return (
    <Link href={`/playlists/${playlist.slug}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-md">
        {/* Thumbnail area */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
          {playlist.thumbnailUrl ? (
            <img
              src={playlist.thumbnailUrl}
              alt={playlist.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ListVideo className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}

          {/* Video count overlay */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="gap-1 bg-black/70 text-white backdrop-blur-sm">
              <PlayCircle className="h-3 w-3" />
              {videoCount} วิดีโอ
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-base group-hover:text-primary">
            {playlist.title}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {playlist.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {playlist.description}
            </p>
          )}
          {duration && (
            <p className="mt-2 text-xs text-muted-foreground">
              รวม: {duration}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
