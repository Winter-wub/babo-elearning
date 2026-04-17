// ── Rewritten components ──────────────────────────────────────────────────────
export { HomeHeader } from "./home-header";
export { HomeFooter } from "./home-footer";

// ── New components ────────────────────────────────────────────────────────────
export { HomeHero } from "./home-hero";
/** @deprecated Use HomeHero instead */
export { HomeHeroCarousel } from "./home-hero-carousel";
export { TrendingSection } from "./trending-section";
export { TrendingListItem } from "./trending-list-item";
export { PlaylistCard } from "./playlist-card";
export { FeaturedPlaylistsSection } from "./featured-playlists-section";
export { CategoryPlaylistsGrid } from "./category-playlists-grid";
export { PlaylistSection } from "./playlist-section";
export { LatestBlogSection } from "./latest-blog-section";
export { NavCoursesDropdown } from "./nav-courses-dropdown";

// ── Existing components (kept for backward compatibility) ─────────────────────
export { HomeVideoSection } from "./home-video-section";
export { PublicVideoCard } from "./public-video-card";

// ── Type re-exports ───────────────────────────────────────────────────────────
export type { PublicVideo } from "./types";
/** @deprecated Use HeroContent from hero-data instead */
export type { HeroSlide } from "./hero-slides";
export type { HeroContent } from "./hero-data";
