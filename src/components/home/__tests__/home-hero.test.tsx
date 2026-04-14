/**
 * Unit tests for HomeHero (static hero section).
 *
 * The hero is a server component rendered with CMS content.
 * We test DOM structure, content rendering, fallback behavior, and security.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "../home-hero";
import { parseHeroContent, HERO_DEFAULTS } from "../hero-data";
import type { HeroContent } from "../hero-data";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
    if (asChild) return <>{children}</>;
    return <button {...rest}>{children}</button>;
  },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FULL_CONTENT: HeroContent = {
  badge: "Trusted by 500+ students",
  headline1: "Want to improve your English?",
  headline2: "We'll guide you there",
  body: "Test your English level for free.",
  ctaLabel: "Start Free Test",
  ctaHref: "/assessment",
  ctaMicro: "No signup required",
  cta2Label: "Browse Courses",
  cta2Href: "/playlists",
  stat1Number: "500+",
  stat1Label: "Students",
  stat2Number: "4.9",
  stat2Label: "Rating",
  stat3Number: "10+",
  stat3Label: "Tests",
  bgColor: "#0f172a",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HomeHero", () => {
  it("renders without crashing", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(document.body).toBeTruthy();
  });

  it('has data-testid="hero-section"', () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
  });

  it("displays the trust badge text", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByText("Trusted by 500+ students")).toBeVisible();
  });

  it("displays both headline lines", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByText("Want to improve your English?")).toBeVisible();
    expect(screen.getByText("We'll guide you there")).toBeVisible();
  });

  it("displays the body text", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByText("Test your English level for free.")).toBeVisible();
  });

  it("renders the primary CTA with correct href", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    const link = screen.getByRole("link", { name: "Start Free Test" });
    expect(link).toHaveAttribute("href", "/assessment");
  });

  it("displays micro-text below the CTA", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByText("No signup required")).toBeVisible();
  });

  it("renders secondary CTA when label is provided", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    const link = screen.getByRole("link", { name: "Browse Courses" });
    expect(link).toHaveAttribute("href", "/playlists");
  });

  it("does NOT render secondary CTA when label is empty", () => {
    const content = { ...FULL_CONTENT, cta2Label: "", cta2Href: "" };
    render(<HomeHero content={content} />);
    expect(screen.queryByRole("link", { name: "Browse Courses" })).not.toBeInTheDocument();
  });

  it("renders all 3 stats with numbers and labels", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    expect(screen.getByText("500+")).toBeVisible();
    expect(screen.getByText("Students")).toBeVisible();
    expect(screen.getByText("4.9")).toBeVisible();
    expect(screen.getByText("Rating")).toBeVisible();
    expect(screen.getByText("10+")).toBeVisible();
    expect(screen.getByText("Tests")).toBeVisible();
  });

  it("applies background color via inline style", () => {
    render(<HomeHero content={FULL_CONTENT} />);
    const section = screen.getByTestId("hero-section");
    expect(section).toHaveStyle({ backgroundColor: "#0f172a" });
  });

  it("falls back to defaults when parseHeroContent receives empty map", () => {
    const content = parseHeroContent({});
    render(<HomeHero content={content} />);
    // Check that headline defaults render
    expect(screen.getByText(HERO_DEFAULTS["hero.headline1"]!)).toBeVisible();
    expect(screen.getByText(HERO_DEFAULTS["hero.headline2"]!)).toBeVisible();
  });

  it("does not render empty badge when badge is empty string", () => {
    const content = { ...FULL_CONTENT, badge: "" };
    render(<HomeHero content={content} />);
    // No badge element should be present
    const section = screen.getByTestId("hero-section");
    const badges = section.querySelectorAll("span.uppercase");
    expect(badges).toHaveLength(0);
  });
});

describe("parseHeroContent", () => {
  it("rejects javascript: protocol in ctaHref and falls back to default", () => {
    const content = parseHeroContent({ "hero.ctaHref": "javascript:alert(1)" });
    expect(content.ctaHref).toBe(HERO_DEFAULTS["hero.ctaHref"]);
  });

  it("rejects javascript: protocol in cta2Href and falls back to default", () => {
    const content = parseHeroContent({ "hero.cta2Href": "javascript:void(0)" });
    expect(content.cta2Href).toBe(HERO_DEFAULTS["hero.cta2Href"]);
  });

  it("accepts relative URLs starting with /", () => {
    const content = parseHeroContent({ "hero.ctaHref": "/some-page" });
    expect(content.ctaHref).toBe("/some-page");
  });

  it("accepts https URLs", () => {
    const content = parseHeroContent({ "hero.ctaHref": "https://example.com" });
    expect(content.ctaHref).toBe("https://example.com");
  });

  it("rejects invalid hex colors and falls back to default", () => {
    const content = parseHeroContent({ "hero.bgColor": "red; background-image: url(evil)" });
    expect(content.bgColor).toBe(HERO_DEFAULTS["hero.bgColor"]);
  });

  it("accepts valid 6-digit hex colors", () => {
    const content = parseHeroContent({ "hero.bgColor": "#1e293b" });
    expect(content.bgColor).toBe("#1e293b");
  });
});
