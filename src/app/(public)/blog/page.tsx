import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getPublishedBlogPosts, getBlogCategories } from "@/actions/blog.actions";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR: 5 minutes

export const metadata: Metadata = {
  title: "บทความ | English with Gift",
  description: "บทความและเคล็ดลับด้านภาษาอังกฤษ เรียนรู้ไวยากรณ์ คำศัพท์ และทักษะการสื่อสาร",
};

function estimateReadTime(excerpt: string | null): number {
  const words = (excerpt ?? "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200) + 2); // rough estimate
}

async function BlogListingContent({
  categorySlug,
  page,
}: {
  categorySlug?: string;
  page: number;
}) {
  const [postsResult, categories] = await Promise.all([
    getPublishedBlogPosts(page, categorySlug),
    getBlogCategories(),
  ]);

  return (
    <>
      {/* Category filter */}
      <div className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1.5 overflow-x-auto py-3 no-scrollbar">
            <Link
              href="/blog"
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                !categorySlug
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              ทั้งหมด
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                  categorySlug === cat.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {postsResult.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <BookOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">ยังไม่มีบทความ</p>
            <p className="text-xs">กลับมาดูใหม่ในภายหลัง</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {postsResult.items.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block focus:outline-none"
                >
                  <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                    {/* Featured image */}
                    <div className="relative bg-muted" style={{ aspectRatio: "16/9" }}>
                      {post.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      {post.categories[0] && (
                        <div className="absolute top-3 left-3">
                          <Badge className={cn("text-xs shadow-sm", post.categories[0].color)}>
                            {post.categories[0].name}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {estimateReadTime(post.excerpt)} นาที
                      </p>
                      <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {post.excerpt}
                        </p>
                      )}
                      <p className="mt-auto pt-3 text-xs text-muted-foreground">
                        {post.publishedAt &&
                          new Date(post.publishedAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {postsResult.meta.totalPages > 1 && (
              <div className="mt-10 flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/blog?${categorySlug ? `category=${categorySlug}&` : ""}page=${page - 1}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    ก่อนหน้า
                  </Link>
                )}
                {page < postsResult.meta.totalPages && (
                  <Link
                    href={`/blog?${categorySlug ? `category=${categorySlug}&` : ""}page=${page + 1}`}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    ถัดไป
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { category, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <BookOpen className="h-8 w-8 mb-4 opacity-80" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            บทความและความรู้
          </h1>
          <p className="mt-3 max-w-2xl text-base text-primary-foreground/80">
            เรียนรู้ภาษาอังกฤษผ่านบทความที่ครอบคลุมทุกด้าน ตั้งแต่ไวยากรณ์ คำศัพท์ ไปจนถึงเคล็ดลับการสื่อสาร
          </p>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <BlogListingContent categorySlug={category} page={page} />
      </Suspense>
    </div>
  );
}
