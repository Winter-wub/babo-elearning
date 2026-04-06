import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaylistsTable } from "@/components/admin/playlists-table";
import { Spinner } from "@/components/ui/spinner";
import { getPlaylists } from "@/actions/playlist.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "จัดการเพลย์ลิสต์",
};

// -----------------------------------------------------------------------
// Search-param types
// -----------------------------------------------------------------------

interface AdminPlaylistsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

// -----------------------------------------------------------------------
// Async data-fetching sub-component (runs inside Suspense)
// -----------------------------------------------------------------------

async function PlaylistsContent({ searchParams }: AdminPlaylistsPageProps) {
  const params = await searchParams;

  const result = await getPlaylists({
    search: params.search,
    page: params.page ? Number(params.page) : 1,
  });

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <PlaylistsTable playlists={result.data.items} meta={result.data.meta} />
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AdminPlaylistsPage(props: AdminPlaylistsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          จัดการเพลย์ลิสต์
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างและจัดการเพลย์ลิสต์ จัดระเบียบวิดีโอเป็นคอลเลกชัน
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <PlaylistsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
