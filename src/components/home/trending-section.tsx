import { TrendingUp } from "lucide-react";
import { TrendingListItem } from "./trending-list-item";
import type { PublicVideo } from "./types";

interface TrendingSectionProps {
  videos: PublicVideo[];
  isAuthenticated: boolean;
}

export function TrendingSection({ videos, isAuthenticated }: TrendingSectionProps) {
  return (
    <section
      data-testid="trending-section"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
    >
      {/* Section heading with icon */}
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        <TrendingUp className="h-6 w-6" aria-hidden="true" />
        Top 10 Trending
      </h2>

      {videos.length > 0 ? (
        <ol className="mt-6 space-y-1" aria-label="Trending videos">
          {/* Cap display at 10 to honour the "Top 10" heading promise */}
          {videos.slice(0, 10).map((video, index) => (
            <li key={video.id}>
              <TrendingListItem
                rank={index + 1}
                video={video}
                isAuthenticated={isAuthenticated}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          No trending content yet
        </p>
      )}
    </section>
  );
}
