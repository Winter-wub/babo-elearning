"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HERO_SLIDES } from "./hero-slides";

const AUTOPLAY_INTERVAL_MS = 5000;

interface HomeHeroCarouselProps {
  /** CMS content map — keys like hero.slide1.headline, hero.slide2.sub, etc. */
  content?: Record<string, string>;
}

export function HomeHeroCarousel({ content }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  // Build slides from CMS content with hardcoded fallbacks
  const slides = React.useMemo(() => {
    return HERO_SLIDES.map((fallback, i) => {
      const n = i + 1;
      return {
        ...fallback,
        headline: content?.[`hero.slide${n}.headline`] || fallback.headline,
        subHeadline: content?.[`hero.slide${n}.sub`] || fallback.subHeadline,
        ctaLabel: content?.[`hero.slide${n}.cta`] || fallback.ctaLabel,
        ctaHref: content?.[`hero.slide${n}.ctaHref`] || fallback.ctaHref,
      };
    });
  }, [content]);

  const totalSlides = slides.length;

  const goTo = React.useCallback(
    (index: number) => {
      setActiveIndex((index + totalSlides) % totalSlides);
    },
    [totalSlides]
  );

  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  // Auto-advance: cleared when paused or on unmount
  React.useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => goTo(activeIndex + 1), AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeIndex, isPaused, goTo]);

  const activeSlide = slides[activeIndex];

  return (
    <section
      data-testid="hero-carousel"
      className="relative overflow-hidden"
      // Pause auto-advance when the user hovers or focuses within the carousel
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      aria-label="คอนเทนต์แนะนำ"
      aria-roledescription="carousel"
    >
      {/* Slide background — gradient placeholder (real hero images dropped in later) */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-all duration-700",
          activeSlide.bgClass
        )}
        aria-hidden="true"
      />

      {/* Main slide content */}
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        {/*
          aria-live="polite" so screen-readers announce the new slide text
          after a transition without interrupting ongoing speech.
        */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="mx-auto max-w-2xl text-center"
          key={activeSlide.id} // Remount text on slide change so aria-live fires
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {activeSlide.headline}
          </h1>
          <p className="mt-6 text-lg leading-8 text-foreground/70">
            {activeSlide.subHeadline}
          </p>
          <div className="mt-10 flex items-center justify-center">
            <Button size="lg" asChild>
              <Link href={activeSlide.ctaHref}>{activeSlide.ctaLabel}</Link>
            </Button>
          </div>
        </div>

        {/* Prev / Next buttons */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="สไลด์ก่อนหน้า"
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2",
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-background/80 text-foreground shadow-md backdrop-blur-sm",
            "transition-colors hover:bg-background focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="สไลด์ถัดไป"
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2",
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-background/80 text-foreground shadow-md backdrop-blur-sm",
            "transition-colors hover:bg-background focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Dot indicators */}
      <div
        className="relative flex items-center justify-center gap-2 pb-8"
        role="tablist"
        aria-label="สไลด์ทั้งหมด"
      >
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`ไปที่สไลด์ ${i + 1}: ${slide.headline}`}
            onClick={() => goTo(i)}
            className={cn(
              "flex items-center justify-center p-[18px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "rounded-full transition-all duration-300"
            )}
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
    </section>
  );
}
