import { PlaylistCard } from "./playlist-card";
import type { PublicPlaylist } from "@/types";

interface FeaturedPlaylistsSectionProps {
  playlists: PublicPlaylist[];
}

export function FeaturedPlaylistsSection({ playlists }: FeaturedPlaylistsSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Featured Playlists
      </h2>

      {playlists.length > 0 ? (
        // 2×2 grid for featured playlists
        <div className="mt-6 grid grid-cols-2 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No featured playlists yet.
        </p>
      )}
    </section>
  );
}
