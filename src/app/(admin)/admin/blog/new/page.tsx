import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { getAdminBlogCategories } from "@/actions/blog.actions";
import { getPublicCategoryPlaylists } from "@/actions/playlist.actions";

export const metadata: Metadata = {
  title: "สร้างบทความใหม่",
};

async function NewPostContent() {
  const [catResult, playlistResult] = await Promise.all([
    getAdminBlogCategories(),
    getPublicCategoryPlaylists(100),
  ]);

  return (
    <BlogPostForm
      mode="create"
      categories={catResult.success ? catResult.data : []}
      playlists={playlistResult.success ? playlistResult.data : []}
    />
  );
}

export default function NewBlogPostPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      }
    >
      <NewPostContent />
    </Suspense>
  );
}
