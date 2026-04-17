import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { BlogCategoriesManager } from "@/components/admin/blog-categories-manager";
import { getAdminBlogCategories } from "@/actions/blog.actions";

export const metadata: Metadata = {
  title: "จัดการหมวดหมู่บล็อก",
};

async function CategoriesContent() {
  const result = await getAdminBlogCategories();

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <BlogCategoriesManager categories={result.data} />;
}

export default function AdminBlogCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          จัดการหมวดหมู่บล็อก
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างและแก้ไขหมวดหมู่สำหรับจัดกลุ่มบทความ
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <CategoriesContent />
      </Suspense>
    </div>
  );
}
