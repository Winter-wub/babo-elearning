import Link from "next/link";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicBlogPost } from "@/types";

interface LatestBlogSectionProps {
  posts: PublicBlogPost[];
}

function estimateReadTime(excerpt: string | null): number {
  const words = (excerpt ?? "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200) + 2);
}

export function LatestBlogSection({ posts }: LatestBlogSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
          บทความล่าสุด
        </h2>
        <Link
          href="/blog"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          ดูทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group block focus:outline-none"
          >
            <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
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
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
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
    </section>
  );
}
