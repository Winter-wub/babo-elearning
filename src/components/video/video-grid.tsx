"use client";

import { useState, useMemo } from "react";
import { Search, VideoOff } from "lucide-react";
import { VideoCard } from "@/components/video/video-card";
import type { Video } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VideoGridProps {
  videos: Video[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component that renders the student's video library as a searchable
 * grid.  The video list itself is fetched server-side and passed as a prop,
 * keeping data fetching in the server component and interactivity here.
 */
export function VideoGrid({ videos }: VideoGridProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        (v.description ?? "").toLowerCase().includes(q)
    );
  }, [videos, search]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search videos…"
          aria-label="Search videos"
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Grid or empty states */}
      {videos.length === 0 ? (
        // No videos assigned at all
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <VideoOff className="mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No videos available</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Videos will appear here once an instructor grants you access.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        // Has videos but search yielded no matches
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">No results for &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => setSearch("")}
            className="mt-2 text-xs text-indigo-600 underline-offset-2 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Video library"
        >
          {filtered.map((video) => (
            <li key={video.id}>
              <VideoCard video={video} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
