import { auth } from "@/lib/auth";
import { getPublicTrendingVideos } from "@/actions/video.actions";
import {
  getPublicFeaturedPlaylists,
  getPublicCategoryPlaylists,
} from "@/actions/playlist.actions";
import { getSiteContent } from "@/actions/content.actions";
import {
  HomeHeader,
  HomeHero,
  TrendingSection,
  FeaturedPlaylistsSection,
  CategoryPlaylistsGrid,
  HomeFooter,
} from "@/components/home";
import { HERO_KEYS, parseHeroContent } from "@/components/home/hero-data";
import { getAppName } from "@/lib/app-config";
import { getThemeSettings } from "@/actions/theme.actions";

/**
 * Public home page — visible to authenticated and unauthenticated users alike.
 * Fetches trending videos, featured playlists, and category playlists in parallel.
 */
export default async function HomePage() {
  const [session, trendingResult, featuredResult, categoryResult, appName, heroContent, themeSettings] =
    await Promise.all([
      auth(),
      getPublicTrendingVideos(10),
      getPublicFeaturedPlaylists(4),
      getPublicCategoryPlaylists(8),
      getAppName(),
      getSiteContent([...HERO_KEYS]).catch(() => ({} as Record<string, string>)),
      getThemeSettings(),
    ]);

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;

  const trendingVideos = trendingResult.success ? trendingResult.data : [];
  const featuredPlaylists = featuredResult.success ? featuredResult.data : [];
  const categoryPlaylists = categoryResult.success ? categoryResult.data : [];

  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        userName={session?.user?.name ?? undefined}
        appName={appName}
        logoUrl={themeSettings.logoSignedUrl || undefined}
      />

      <main className="flex-1">
        <HomeHero content={parseHeroContent(heroContent)} />

        {/* Split row: 60/40 — Trending left, Featured Playlists right */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <TrendingSection
                videos={trendingVideos}
                isAuthenticated={isAuthenticated}
              />
            </div>
            <div className="lg:col-span-2">
              <FeaturedPlaylistsSection playlists={featuredPlaylists} />
            </div>
          </div>
        </section>

        <CategoryPlaylistsGrid playlists={categoryPlaylists} />
      </main>

      <HomeFooter />
    </div>
  );
}
