import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeHeroProps {
  isAuthenticated: boolean;
  userRole?: string;
}

export function HomeHero({ isAuthenticated, userRole }: HomeHeroProps) {
  const ctaHref = isAuthenticated
    ? userRole === "ADMIN"
      ? "/admin/dashboard"
      : "/dashboard"
    : "/register";

  const ctaLabel = isAuthenticated ? "Go to Dashboard" : "Get Started";

  return (
    <section className="relative overflow-hidden bg-muted/40">
      {/* Subtle decorative gradient */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Learn at Your Own Pace
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Access curated video courses from industry experts. Build real
            skills, at your own schedule, with content designed to help you
            succeed.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
