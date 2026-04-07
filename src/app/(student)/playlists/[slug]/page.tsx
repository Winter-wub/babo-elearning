import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ListVideo } from "lucide-react";
import { getPlaylistBySlug } from "@/actions/playlist.actions";
import { PlaylistVideoList } from "@/components/student/playlist-video-list";
import { Button } from "@/components/ui/button";
import { getDeploymentTenantId } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaylistDetailPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PlaylistDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenantId = await getDeploymentTenantId();
  const result = await getPlaylistBySlug(slug, tenantId);

  if (!result.success || !result.data) {
    return { title: "Playlist Not Found" };
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PlaylistDetailPage({
  params,
}: PlaylistDetailPageProps) {
  const { slug } = await params;
  const tenantId = await getDeploymentTenantId();
  const result = await getPlaylistBySlug(slug, tenantId);

  if (!result.success || !result.data) {
    notFound();
  }

  const playlist = result.data;
  const videoCount = playlist.videos.length;
  const totalSeconds = playlist.videos.reduce(
    (sum, pv) => sum + pv.video.duration,
    0
  );
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);
  const durationLabel =
    totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins}m`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back navigation */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/playlists">
            <ArrowLeft className="h-4 w-4" />
            Back to Playlists
          </Link>
        </Button>
      </div>

      {/* Playlist header */}
      <section aria-label="Playlist details" className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ListVideo className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {playlist.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {videoCount} {videoCount === 1 ? "video" : "videos"}
              {totalSeconds > 0 && <> &middot; {durationLabel} total</>}
            </p>
          </div>
        </div>

        {playlist.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {playlist.description}
          </p>
        )}
      </section>

      {/* Video list */}
      <section aria-label="Videos in this playlist">
        <PlaylistVideoList videos={playlist.videos} />
      </section>
    </div>
  );
}
