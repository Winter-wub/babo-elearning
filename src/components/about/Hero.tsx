import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface HeroContent {
  title: string;
  subtitle: string;
  photo: string;
  ctaLabel: string;
  ctaHref: string;
}

/**
 * About page hero band.
 *
 * Always renders (page entry). CTA button renders only when both
 * label and href are non-empty after trim. Avatar shows initials
 * fallback when photo is empty.
 */
export function Hero({ title, subtitle, photo, ctaLabel, ctaHref }: HeroContent) {
  const t = title.trim();
  const s = subtitle.trim();
  const label = ctaLabel.trim();
  const href = ctaHref.trim();
  const hasCta = label.length > 0 && href.length > 0;

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="w-full text-center lg:w-3/5 lg:text-left">
            {t && (
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t}
              </h1>
            )}
            {s && (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/80 mx-auto lg:mx-0">
                {s}
              </p>
            )}
            {hasCta && (
              <div className="mt-10 flex justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link href={href}>{label}</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex w-full justify-center lg:w-2/5">
            <Avatar
              src={photo.trim() || null}
              alt={t || "Instructor photo"}
              fallback={t || "G"}
              className="h-40 w-40 ring-4 ring-primary-foreground/20 shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
