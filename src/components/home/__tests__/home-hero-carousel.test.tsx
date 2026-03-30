/**
 * Unit tests for HomeHeroCarousel.
 *
 * The carousel is a pure client component — no auth, no data fetching.
 * We test DOM structure, ARIA attributes, slide count, and user interaction.
 *
 * next/link is mocked to a plain <a> so the jsdom environment handles it
 * without needing a full Next.js router setup.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeHeroCarousel } from "../home-hero-carousel";
import { HERO_SLIDES } from "../hero-slides";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/link renders as a plain anchor in jsdom
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// lucide-react icons — render as plain spans so icon imports don't break jsdom
vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

// The Button component from shadcn/ui wraps children — minimal stub is enough
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
    ...rest
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    [key: string]: unknown;
  }) => {
    if (asChild) {
      // When asChild=true, Button clones the child — we just render children
      return <>{children}</>;
    }
    return <button {...rest}>{children}</button>;
  },
}));

// cn is a pure string utility; we can keep the real one or use a pass-through
vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("HomeHeroCarousel", () => {
  it("renders without crashing", () => {
    render(<HomeHeroCarousel />);
    // If render throws the test fails; we just assert the section exists
    expect(document.body).toBeTruthy();
  });

  it('has data-testid="hero-carousel" in the DOM', () => {
    render(<HomeHeroCarousel />);
    expect(screen.getByTestId("hero-carousel")).toBeInTheDocument();
  });

  it("shows the first slide headline on mount", () => {
    render(<HomeHeroCarousel />);
    expect(screen.getByText(HERO_SLIDES[0].headline)).toBeVisible();
  });

  it("shows the first slide sub-headline on mount", () => {
    render(<HomeHeroCarousel />);
    expect(screen.getByText(HERO_SLIDES[0].subHeadline)).toBeVisible();
  });

  it('prev button exists and has aria-label="Previous slide"', () => {
    render(<HomeHeroCarousel />);
    expect(
      screen.getByRole("button", { name: "Previous slide" })
    ).toBeInTheDocument();
  });

  it('next button exists and has aria-label="Next slide"', () => {
    render(<HomeHeroCarousel />);
    expect(
      screen.getByRole("button", { name: "Next slide" })
    ).toBeInTheDocument();
  });

  it("dot indicator count equals the number of slides in HERO_SLIDES", () => {
    render(<HomeHeroCarousel />);
    // Each dot has role="tab" per the implementation
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(HERO_SLIDES.length);
  });

  it("clicking next button advances to the second slide", () => {
    render(<HomeHeroCarousel />);

    // Confirm first slide is shown
    expect(screen.getByText(HERO_SLIDES[0].headline)).toBeVisible();

    // Click next
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));

    // Second slide headline should now be visible
    expect(screen.getByText(HERO_SLIDES[1].headline)).toBeVisible();
  });

  it("clicking prev button from the first slide wraps to the last slide", () => {
    render(<HomeHeroCarousel />);

    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));

    const lastSlide = HERO_SLIDES[HERO_SLIDES.length - 1];
    expect(screen.getByText(lastSlide.headline)).toBeVisible();
  });

  it('aria-live="polite" region is present for screen-reader announcements', () => {
    const { container } = render(<HomeHeroCarousel />);
    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeInTheDocument();
  });

  it("dot indicators have aria-selected=true on the active slide and false on others", () => {
    render(<HomeHeroCarousel />);
    const dots = screen.getAllByRole("tab");
    // First dot should be selected on mount
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
    // All other dots should not be selected
    for (let i = 1; i < dots.length; i++) {
      expect(dots[i]).toHaveAttribute("aria-selected", "false");
    }
  });

  it("clicking a dot indicator navigates directly to that slide", () => {
    render(<HomeHeroCarousel />);

    // There are at least 3 slides; click the third dot
    const dots = screen.getAllByRole("tab");
    fireEvent.click(dots[2]);

    expect(screen.getByText(HERO_SLIDES[2].headline)).toBeVisible();
  });
});
