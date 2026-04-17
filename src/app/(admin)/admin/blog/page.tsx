import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { BlogPostsTable } from "@/components/admin/blog-posts-table";
import { getAdminBlogPosts, getAdminBlogCategories } from "@/actions/blog.actions";

export const metadata: Metadata = {
  title: "จัดการบทความบล็อก",
};

async function BlogContent() {
  const [postsResult, categoriesResult] = await Promise.all([
    getAdminBlogPosts(),
    getAdminBlogCategories(),
  ]);

  if (!postsResult.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {postsResult.error}
      </div>
    );
  }

  return (
    <BlogPostsTable
      initialData={postsResult.data}
      categories={categoriesResult.success ? categoriesResult.data : []}
    />
  );
}

export default function AdminBlogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          จัดการบทความบล็อก
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างและจัดการบทความสำหรับผู้เรียน
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <BlogContent />
      </Suspense>
    </div>
  );
}
