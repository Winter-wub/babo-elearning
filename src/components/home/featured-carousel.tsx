"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicPlaylist } from "@/types";

interface FeaturedCarouselProps {
  playlists: PublicPlaylist[];
}

export function FeaturedCarousel({ playlists }: FeaturedCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const total = playlists.length;
  const showControls = total > 1;

  const scrollTo = React.useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const slide = container.children[index] as HTMLElement | undefined;
      if (slide) {
        container.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
      }
    },
    []
  );

  const goPrev = () => scrollTo((activeIndex - 1 + total) % total);
  const goNext = () => scrollTo((activeIndex + 1) % total);

  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container || total <= 1) return;

    const slides = Array.from(container.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = slides.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.5 }
    );

    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, [total]);

  if (total === 0) return null;

  return (
    <div
      data-testid="course-banner-carousel"
      aria-roledescription="carousel"
      aria-label="คอร์สแนะนำ"
    >
      <div
        ref={scrollRef}
        className="relative flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {playlists.map((playlist, index) => (
          <Link
            key={playlist.id}
            href={`/playlists/${playlist.slug}`}
            className="min-w-full snap-start flex-shrink-0 block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              {playlist.thumbnailUrl ? (
                <img
                  src={playlist.thumbnailUrl}
                  alt={playlist.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                />
              ) : (
                <div
                  className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted"
                  aria-hidden="true"
                />
              )}

              {/* Bottom gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

              {/* Title + badge overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-white line-clamp-2">
                  {playlist.title}
                </h3>
                <Badge variant="secondary" className="mt-2 text-xs shadow">
                  {playlist.videoCount} วิดีโอ
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Controls: arrows + dots */}
      {showControls && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            aria-label="สไลด์ก่อนหน้า"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-muted text-foreground shadow-sm",
              "transition-colors hover:bg-muted/80 focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2" role="tablist" aria-label="สไลด์ทั้งหมด">
            {playlists.map((playlist, i) => (
              <button
                key={playlist.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`ไปที่สไลด์ ${i + 1}: ${playlist.title}`}
                onClick={() => scrollTo(i)}
                className="flex items-center justify-center p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    i === activeIndex
                      ? "w-6 bg-foreground"
                      : "w-2 bg-foreground/30 hover:bg-foreground/60"
                  )}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="สไลด์ถัดไป"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-muted text-foreground shadow-sm",
              "transition-colors hover:bg-muted/80 focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
