/**
 * Unit tests for TrendingListItem.
 *
 * The component is a pure presentational element — no side effects, no async.
 * We verify rank rendering, title/duration display, and auth-aware link href.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendingListItem } from "../trending-list-item";
import type { PublicVideo } from "../types";

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makePublicVideo(overrides: Partial<PublicVideo> = {}): PublicVideo {
  return {
    id: "video-abc",
    title: "Introduction to Finance",
    description: "A beginner finance course",
    duration: 305, // 5:05
    thumbnailUrl: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    playCount: 100,
    isFeatured: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("TrendingListItem", () => {
  describe("rank rendering", () => {
    it("renders rank 1", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo()}
          isAuthenticated={false}
        />
      );
      // The rank badge has aria-label="Rank 1" and visible text "1"
      expect(screen.getByLabelText("Rank 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Rank 1")).toHaveTextContent("1");
    });

    it("renders rank 5", () => {
      render(
        <TrendingListItem
          rank={5}
          video={makePublicVideo()}
          isAuthenticated={false}
        />
      );
      expect(screen.getByLabelText("Rank 5")).toHaveTextContent("5");
    });

    it("renders rank 10", () => {
      render(
        <TrendingListItem
          rank={10}
          video={makePublicVideo()}
          isAuthenticated={false}
        />
      );
      expect(screen.getByLabelText("Rank 10")).toHaveTextContent("10");
    });
  });

  describe("title rendering", () => {
    it("renders the video title", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({ title: "Advanced Tax Planning" })}
          isAuthenticated={false}
        />
      );
      expect(screen.getByText("Advanced Tax Planning")).toBeInTheDocument();
    });
  });

  describe("duration rendering", () => {
    it("renders formatted duration for a video with 305 seconds (5:05)", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({ duration: 305 })}
          isAuthenticated={false}
        />
      );
      // formatDuration(305) => "5:05"
      expect(screen.getByText("5:05")).toBeInTheDocument();
    });

    it("renders formatted duration for a video with 3600 seconds (1:00:00)", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({ duration: 3600 })}
          isAuthenticated={false}
        />
      );
      // formatDuration(3600) => "1:00:00"
      expect(screen.getByText("1:00:00")).toBeInTheDocument();
    });

    it("renders formatted duration for a video with 60 seconds (1:00)", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({ duration: 60 })}
          isAuthenticated={false}
        />
      );
      expect(screen.getByText("1:00")).toBeInTheDocument();
    });
  });

  describe("link href — authentication state", () => {
    it("when isAuthenticated=false, link href contains /login", () => {
      const video = makePublicVideo({ id: "vid-123" });
      render(
        <TrendingListItem rank={1} video={video} isAuthenticated={false} />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toContain("/login");
    });

    it("when isAuthenticated=false, link href encodes the video callback URL", () => {
      const video = makePublicVideo({ id: "vid-123" });
      render(
        <TrendingListItem rank={1} video={video} isAuthenticated={false} />
      );
      const link = screen.getByRole("link");
      // The callbackUrl should reference /videos/vid-123 in encoded form
      expect(link.getAttribute("href")).toContain("vid-123");
    });

    it("when isAuthenticated=true, link href is /videos/:id", () => {
      const video = makePublicVideo({ id: "vid-456" });
      render(
        <TrendingListItem rank={1} video={video} isAuthenticated={true} />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("/videos/vid-456");
    });

    it("when isAuthenticated=true, link href does not contain /login", () => {
      const video = makePublicVideo({ id: "vid-789" });
      render(
        <TrendingListItem rank={1} video={video} isAuthenticated={true} />
      );
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).not.toContain("/login");
    });
  });

  describe("thumbnail", () => {
    it("renders a fallback div (no img tag) when thumbnailUrl is null", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({ thumbnailUrl: null })}
          isAuthenticated={false}
        />
      );
      // There should be no img element when there is no thumbnail
      expect(document.querySelector("img")).toBeNull();
    });

    it("renders an img tag when thumbnailUrl is provided", () => {
      render(
        <TrendingListItem
          rank={1}
          video={makePublicVideo({
            thumbnailUrl: "https://example.com/thumb.jpg",
          })}
          isAuthenticated={false}
        />
      );
      const img = document.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("https://example.com/thumb.jpg");
    });
  });
});
