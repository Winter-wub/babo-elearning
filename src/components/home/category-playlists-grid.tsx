import { PlaylistCard } from "./playlist-card";
import type { PublicPlaylist } from "@/types";

interface CategoryPlaylistsGridProps {
  playlists: PublicPlaylist[];
}

export function CategoryPlaylistsGrid({ playlists }: CategoryPlaylistsGridProps) {
  return (
    <section className="py-12 px-4 max-w-7xl mx-auto sm:px-6 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Browse by Category
      </h2>

      {playlists.length > 0 ? (
        // Responsive 4-col grid: 1 col on mobile → 2 on sm → 4 on lg
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No categories available yet.
        </p>
      )}
    </section>
  );
}
