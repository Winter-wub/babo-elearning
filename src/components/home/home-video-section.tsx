import { Film } from "lucide-react";
import { PublicVideoCard } from "./public-video-card";
import type { PublicVideo } from "./types";

interface HomeVideoSectionProps {
  title: string;
  videos: PublicVideo[];
  emptyMessage?: string;
  isAuthenticated: boolean;
}

export function HomeVideoSection({
  title,
  videos,
  emptyMessage = "No videos available yet.",
  isAuthenticated,
}: HomeVideoSectionProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>

      {videos.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {videos.map((video) => (
            <PublicVideoCard
              key={video.id}
              video={video}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <Film className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}
