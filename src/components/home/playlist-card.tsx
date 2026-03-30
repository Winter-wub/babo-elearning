import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PublicPlaylist } from "@/types";

interface PlaylistCardProps {
  playlist: PublicPlaylist;
  // Allow callers to override the destination href; defaults to /playlists/[slug]
  href?: string;
}

export function PlaylistCard({ playlist, href }: PlaylistCardProps) {
  const destination = href ?? `/playlists/${playlist.slug}`;

  return (
    <Link
      href={destination}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      {/* Thumbnail container — 16:9 aspect ratio */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-md">
        {playlist.thumbnailUrl ? (
          <img
            src={playlist.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          // Gradient placeholder — replaced by real image when content team provides it
          <div
            className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted"
            aria-hidden="true"
          />
        )}

        {/* Video count badge — bottom-left overlay */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-xs shadow">
            {playlist.videoCount} {playlist.videoCount === 1 ? "video" : "videos"}
          </Badge>
        </div>
      </div>

      {/* Title below thumbnail */}
      <p className="mt-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
        {playlist.title}
      </p>
    </Link>
  );
}
