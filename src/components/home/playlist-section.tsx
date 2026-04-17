import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import type { PublicPlaylistSection } from "@/types";

interface PlaylistSectionProps {
  playlist: PublicPlaylistSection;
}

export function PlaylistSection({ playlist }: PlaylistSectionProps) {
  if (playlist.videos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Section header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {playlist.title}
          </h2>
          {playlist.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 max-w-2xl">
              {playlist.description}
            </p>
          )}
        </div>
        <Link
          href={`/playlists/${playlist.slug}`}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          ดูหลักสูตรทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal scrollable video cards */}
      <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:overflow-x-visible sm:pb-0">
          {playlist.videos.map((video) => (
            <Link
              key={video.id}
              href={`/playlists/${playlist.slug}`}
              className="group block w-56 shrink-0 snap-start sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-md">
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted"
                    aria-hidden="true"
                  >
                    <Play className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Duration badge */}
                {video.duration > 0 && (
                  <div className="absolute bottom-1.5 right-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 font-mono"
                    >
                      {formatDuration(video.duration)}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Title */}
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                {video.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
