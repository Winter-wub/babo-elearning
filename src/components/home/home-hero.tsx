import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { HeroContent } from "./hero-data";

interface HomeHeroProps {
  content: HeroContent;
}

/**
 * Static hero section — IELTS Advantage-inspired layout.
 * Server component (no "use client") — zero client JS shipped.
 */
export function HomeHero({ content }: HomeHeroProps) {
  return (
    <section
      data-testid="hero-section"
      aria-label="แนะนำ"
      className="relative w-full"
      style={{ backgroundColor: content.bgColor }}
    >
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="flex flex-col items-center text-center">
          {/* Trust badge */}
          {content.badge && (
            <span className="mb-6 inline-flex items-center rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
              {content.badge}
            </span>
          )}

          {/* Two-line headline */}
          <h1 className="break-words text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block text-white">{content.headline1}</span>
            <span className="block text-amber-400">{content.headline2}</span>
          </h1>

          {/* Supporting paragraph */}
          {content.body && (
            <p className="mx-auto mt-6 max-w-lg break-words text-base leading-relaxed text-slate-300 sm:text-lg">
              {content.body}
            </p>
          )}

          {/* CTA group */}
          <div className="mt-10 flex flex-col items-center gap-3">
            {/* Primary CTA */}
            <Button
              size="lg"
              asChild
              className="w-full rounded-full bg-amber-500 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-amber-400 sm:w-auto sm:text-lg"
            >
              <Link href={content.ctaHref}>{content.ctaLabel}</Link>
            </Button>

            {/* Micro-text */}
            {content.ctaMicro && (
              <p className="text-xs text-slate-400">{content.ctaMicro}</p>
            )}

            {/* Secondary CTA */}
            {content.cta2Label && (
              <Link
                href={content.cta2Href}
                className="mt-1 text-sm text-slate-300 underline underline-offset-2 transition-colors hover:text-white"
              >
                {content.cta2Label}
              </Link>
            )}
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid w-full max-w-md grid-cols-3 gap-6 border-t border-slate-700 pt-8">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white sm:text-3xl">
                {content.stat1Number}
              </span>
              <span className="mt-1 text-center text-xs text-slate-400 sm:text-sm">
                {content.stat1Label}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white sm:text-3xl">
                {content.stat2Number}
              </span>
              <span className="mt-1 text-center text-xs text-slate-400 sm:text-sm">
                {content.stat2Label}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white sm:text-3xl">
                {content.stat3Number}
              </span>
              <span className="mt-1 text-center text-xs text-slate-400 sm:text-sm">
                {content.stat3Label}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
