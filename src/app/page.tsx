import { auth } from "@/lib/auth";
import {
  getPublicFeaturedVideos,
  getPublicLatestVideos,
  getPublicMostPlayedVideos,
} from "@/actions/video.actions";
import {
  HomeHeader,
  HomeHero,
  HomeVideoSection,
  HomeFooter,
} from "@/components/home";

/**
 * Public home page — visible to authenticated and unauthenticated users alike.
 * Fetches featured, latest, and most-played videos in parallel.
 */
export default async function HomePage() {
  const [session, featuredResult, latestResult, mostPlayedResult] =
    await Promise.all([
      auth(),
      getPublicFeaturedVideos(),
      getPublicLatestVideos(),
      getPublicMostPlayedVideos(),
    ]);

  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role;

  const featuredVideos = featuredResult.success ? featuredResult.data : [];
  const latestVideos = latestResult.success ? latestResult.data : [];
  const mostPlayedVideos = mostPlayedResult.success ? mostPlayedResult.data : [];

  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader
        isAuthenticated={isAuthenticated}
        userRole={userRole}
        userName={session?.user?.name ?? undefined}
      />

      <main className="flex-1">
        <HomeHero isAuthenticated={isAuthenticated} userRole={userRole} />

        {featuredVideos.length > 0 && (
          <HomeVideoSection
            title="Featured"
            videos={featuredVideos}
            isAuthenticated={isAuthenticated}
          />
        )}

        <HomeVideoSection
          title="Latest Videos"
          videos={latestVideos}
          emptyMessage="No videos available yet. Check back soon!"
          isAuthenticated={isAuthenticated}
        />

        <HomeVideoSection
          title="Most Played"
          videos={mostPlayedVideos}
          emptyMessage="No plays recorded yet."
          isAuthenticated={isAuthenticated}
        />
      </main>

      <HomeFooter />
    </div>
  );
}
