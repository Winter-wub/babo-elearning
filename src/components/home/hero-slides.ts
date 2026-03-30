export type HeroSlide = {
  id: string;
  headline: string;
  subHeadline: string;
  ctaLabel: string;
  ctaHref: string;
  bgClass: string; // Tailwind gradient class applied to the slide background
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    headline: "Learn at Your Own Pace",
    subHeadline: "Curated video courses from industry experts",
    ctaLabel: "Browse Courses",
    ctaHref: "#",
    bgClass: "from-primary/20 via-primary/10 to-background",
  },
  {
    id: "2",
    headline: "Build Real Financial Skills",
    subHeadline: "From beginner investing to advanced tax planning",
    ctaLabel: "Get Started",
    ctaHref: "/register",
    bgClass: "from-blue-500/20 via-blue-400/10 to-background",
  },
  {
    id: "3",
    headline: "Learn with the Experts",
    subHeadline: "Structured playlists designed for your goals",
    ctaLabel: "View Playlists",
    ctaHref: "#",
    bgClass: "from-emerald-500/20 via-emerald-400/10 to-background",
  },
];
