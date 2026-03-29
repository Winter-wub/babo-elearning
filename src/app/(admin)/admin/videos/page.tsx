import type { Metadata } from "next";
import { Suspense } from "react";
import { VideosTable } from "@/components/admin/videos-table";
import { Spinner } from "@/components/ui/spinner";
import { getVideos } from "@/actions/video.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Video Management",
};

// -----------------------------------------------------------------------
// Search-param types
// -----------------------------------------------------------------------

interface AdminVideosPageProps {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
  }>;
}

// -----------------------------------------------------------------------
// Async data-fetching sub-component (runs inside Suspense)
// -----------------------------------------------------------------------

async function VideosContent({ searchParams }: AdminVideosPageProps) {
  const params = await searchParams;

  const result = await getVideos({
    search: params.search,
    isActive:
      params.isActive === "true"
        ? true
        : params.isActive === "false"
        ? false
        : undefined,
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
    <VideosTable videos={result.data.items} meta={result.data.meta} />
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AdminVideosPage(props: AdminVideosPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Video Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and manage videos, control visibility, and review access permissions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <VideosContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
