import type { Metadata } from "next";
import { PlaylistForm } from "@/components/admin/playlist-form";

export const metadata: Metadata = {
  title: "Create Playlist",
};

export default function NewPlaylistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Playlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new playlist to organize your video content.
        </p>
      </div>

      <PlaylistForm />
    </div>
  );
}
