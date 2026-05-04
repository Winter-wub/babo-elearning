import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaylistForm } from "@/components/admin/playlist-form";
import { PlaylistVideosManager } from "@/components/admin/playlist-videos-manager";
import { PlaylistContentBlocksEditor } from "@/components/admin/playlist-content-blocks-editor";
import { getPlaylistById, getAllVideosForPicker } from "@/actions/playlist.actions";
import { getAdminContentBlocks } from "@/actions/content-block.actions";

export const metadata: Metadata = {
  title: "Edit Playlist",
};

interface EditPlaylistPageProps {
  params: Promise<{ playlistId: string }>;
}

export default async function EditPlaylistPage({ params }: EditPlaylistPageProps) {
  const { playlistId } = await params;

  const [playlistResult, videosResult, blocksResult] = await Promise.all([
    getPlaylistById(playlistId),
    getAllVideosForPicker(),
    getAdminContentBlocks(playlistId),
  ]);

  if (!playlistResult.success || !playlistResult.data) {
    notFound();
  }

  const playlist = playlistResult.data;
  const allVideos = videosResult.success ? videosResult.data : [];
  const contentBlocks = blocksResult.success ? blocksResult.data : [];

  // Videos already in the playlist
  const playlistVideoIds = new Set(playlist.videos.map((pv) => pv.videoId));
  // Available videos not yet in the playlist
  const availableVideos = allVideos.filter((v) => !playlistVideoIds.has(v.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Playlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update playlist details and manage its videos.
        </p>
      </div>

      <PlaylistForm
        playlist={{
          id: playlist.id,
          title: playlist.title,
          description: playlist.description ?? "",
          slug: playlist.slug,
          isActive: playlist.isActive,
          isFeatured: playlist.isFeatured,
          sortOrder: playlist.sortOrder,
          thumbnailKey: playlist.thumbnailKey,
          thumbnailUrl: playlist.thumbnailUrl,
          demoVideoId: playlist.demoVideoId,
        }}
        allVideos={allVideos.map((v) => ({ id: v.id, title: v.title }))}
      />

      <PlaylistContentBlocksEditor
        playlistId={playlist.id}
        initialBlocks={contentBlocks}
      />

      <PlaylistVideosManager
        playlistId={playlist.id}
        currentVideos={playlist.videos.map((pv) => ({
          id: pv.video.id,
          title: pv.video.title,
          thumbnailUrl: pv.video.thumbnailUrl,
          duration: pv.video.duration,
          position: pv.position,
        }))}
        availableVideos={availableVideos.map((v) => ({
          id: v.id,
          title: v.title,
          thumbnailUrl: v.thumbnailUrl,
          duration: v.duration,
        }))}
      />
    </div>
  );
}
