import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { getAdminBlogPost, getAdminBlogCategories } from "@/actions/blog.actions";
import { getPublicCategoryPlaylists } from "@/actions/playlist.actions";

export const metadata: Metadata = {
  title: "แก้ไขบทความ",
};

async function EditPostContent({ postId }: { postId: string }) {
  const [postResult, categoriesResult, playlistResult] = await Promise.all([
    getAdminBlogPost(postId),
    getAdminBlogCategories(),
    getPublicCategoryPlaylists(100),
  ]);

  if (!postResult.success) {
    notFound();
  }

  return (
    <BlogPostForm
      mode="edit"
      post={postResult.data}
      categories={categoriesResult.success ? categoriesResult.data : []}
      playlists={playlistResult.success ? playlistResult.data : []}
    />
  );
}

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      }
    >
      <EditPostContent postId={postId} />
    </Suspense>
  );
}
