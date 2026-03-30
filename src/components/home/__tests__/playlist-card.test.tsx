/**
 * Unit tests for PlaylistCard.
 *
 * PlaylistCard is a pure presentational component; no auth, no data fetching.
 * We verify title, video count badge, thumbnail fallback, and link destination.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaylistCard } from "../playlist-card";
import type { PublicPlaylist } from "@/types";

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

// Badge is a simple wrapper — render children as a span
vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makePublicPlaylist(
  overrides: Partial<PublicPlaylist> = {}
): PublicPlaylist {
  return {
    id: "playlist-1",
    title: "Finance Fundamentals",
    thumbnailUrl: null,
    slug: "finance-fundamentals",
    videoCount: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("PlaylistCard", () => {
  describe("title", () => {
    it("renders the playlist title", () => {
      render(<PlaylistCard playlist={makePublicPlaylist()} />);
      expect(screen.getByText("Finance Fundamentals")).toBeInTheDocument();
    });

    it("renders a different title correctly", () => {
      render(
        <PlaylistCard
          playlist={makePublicPlaylist({ title: "Advanced Investing" })}
        />
      );
      expect(screen.getByText("Advanced Investing")).toBeInTheDocument();
    });
  });

  describe("video count badge", () => {
    it("renders the video count badge with the correct number", () => {
      render(<PlaylistCard playlist={makePublicPlaylist({ videoCount: 5 })} />);
      // Badge renders "{count} videos"
      expect(screen.getByText(/5 videos/i)).toBeInTheDocument();
    });

    it('renders singular "video" label when videoCount is 1', () => {
      render(<PlaylistCard playlist={makePublicPlaylist({ videoCount: 1 })} />);
      expect(screen.getByText(/1 video/i)).toBeInTheDocument();
      // Must not say "1 videos"
      expect(screen.queryByText(/1 videos/i)).toBeNull();
    });

    it("renders badge with count 0", () => {
      render(<PlaylistCard playlist={makePublicPlaylist({ videoCount: 0 })} />);
      expect(screen.getByText(/0 videos/i)).toBeInTheDocument();
    });

    it("renders badge with a large count", () => {
      render(
        <PlaylistCard playlist={makePublicPlaylist({ videoCount: 42 })} />
      );
      expect(screen.getByText(/42 videos/i)).toBeInTheDocument();
    });
  });

  describe("thumbnail", () => {
    it("renders a gradient placeholder div (no broken img) when thumbnailUrl is null", () => {
      render(<PlaylistCard playlist={makePublicPlaylist({ thumbnailUrl: null })} />);
      // There should be no img element with a null/empty src
      const img = document.querySelector("img");
      expect(img).toBeNull();
    });

    it("renders an img tag when thumbnailUrl is provided", () => {
      render(
        <PlaylistCard
          playlist={makePublicPlaylist({
            thumbnailUrl: "https://cdn.example.com/playlist.jpg",
          })}
        />
      );
      const img = document.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe(
        "https://cdn.example.com/playlist.jpg"
      );
    });
  });

  describe("link destination", () => {
    it("defaults link href to /playlists/:slug", () => {
      render(
        <PlaylistCard
          playlist={makePublicPlaylist({ slug: "finance-fundamentals" })}
        />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe(
        "/playlists/finance-fundamentals"
      );
    });

    it("overrides the href when the href prop is provided", () => {
      render(
        <PlaylistCard
          playlist={makePublicPlaylist({ slug: "finance-fundamentals" })}
          href="/custom-path/xyz"
        />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("/custom-path/xyz");
    });

    it("uses the slug from the playlist for the default href", () => {
      render(
        <PlaylistCard
          playlist={makePublicPlaylist({ slug: "tax-planning-101" })}
        />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toContain("tax-planning-101");
    });
  });
});
