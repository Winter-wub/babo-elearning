import type { Metadata } from "next";
import { getActivePlaylists } from "@/actions/playlist.actions";
import { PlaylistBrowseCard } from "@/components/student/playlist-browse-card";

export const metadata: Metadata = {
  title: "เพลย์ลิสต์",
};

export default async function PlaylistsPage() {
  const result = await getActivePlaylists();
  const playlists = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          เพลย์ลิสต์
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {playlists.length > 0
            ? `เรียกดู ${playlists.length} เพลย์ลิสต์`
            : "ยังไม่มีเพลย์ลิสต์ในขณะนี้ โปรดกลับมาตรวจสอบในภายหลัง"}
        </p>
      </div>

      {/* Playlist grid */}
      {playlists.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <PlaylistBrowseCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
