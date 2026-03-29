import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getPermittedVideos } from "@/actions/video.actions";
import { VideoGrid } from "@/components/video/video-grid";

export const metadata: Metadata = {
  title: "My Dashboard",
};

/**
 * Student dashboard — server component.
 *
 * Fetches the list of videos the authenticated student is permitted to watch
 * and passes them to the client-side `VideoGrid` for search/filter and display.
 */
export default async function StudentDashboardPage() {
  // ---- Authentication guard -----------------------------------------------
  // Middleware handles the primary redirect, but we check here as well for
  // defence-in-depth in case the middleware config is ever relaxed.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // ---- Data fetch ---------------------------------------------------------
  const result = await getPermittedVideos();

  // On unexpected server error fall back to an empty list so the page still
  // renders rather than throwing and showing the error boundary.
  const videos = result.success ? result.data : [];

  // ---- Render -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My Videos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {videos.length > 0
            ? `${videos.length} video${videos.length === 1 ? "" : "s"} available`
            : "Your assigned videos will appear here."}
        </p>
      </div>

      {/* Video grid with search */}
      <VideoGrid videos={videos} />
    </div>
  );
}
