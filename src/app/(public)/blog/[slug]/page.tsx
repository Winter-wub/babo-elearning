import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, CalendarDays, Play, ListVideo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublishedBlogPost, getPublishedBlogPosts } from "@/actions/blog.actions";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR: 5 minutes

// -----------------------------------------------------------------------
// Dynamic SEO metadata
// -----------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "ไม่พบบทความ" };

  const description = post.excerpt || post.title;

  return {
    title: `${post.title} | English with Gift`,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      ...(post.featuredImageUrl && { images: [post.featuredImageUrl] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      ...(post.featuredImageUrl && { images: [post.featuredImageUrl] }),
    },
  };
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);

  if (!post) notFound();

  // Estimate read time from content length
  const wordCount = post.content.replace(/<[^>]*>/g, "").split(/\s+/).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article>
      {/* Hero / cover image */}
      {post.featuredImageUrl ? (
        <div className="relative w-full bg-muted" style={{ maxHeight: 400 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featuredImageUrl}
            alt={post.title}
            className="mx-auto h-full max-h-[400px] w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-2 bg-primary" />
      )}

      {/* Article content — Notion-style clean reading */}
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <header>
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {post.categories.map((cat) => (
                <Link key={cat.id} href={`/blog?category=${cat.slug}`}>
                  <Badge className={cn("text-xs", cat.color)}>{cat.name}</Badge>
                </Link>
              ))}
            </div>
          )}

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-foreground leading-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.author.name && (
              <span className="font-medium text-foreground">{post.author.name}</span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {post.publishedAt &&
                new Date(post.publishedAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readMinutes} นาทีในการอ่าน
            </span>
          </div>

          {post.excerpt && (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          <hr className="mt-8 border-border" />
        </header>

        {/* Body — rendered TipTap HTML */}
        <div
          className={cn(
            "mt-8",
            // Notion-style prose: clean, spacious, reader-friendly
            "prose prose-lg dark:prose-invert max-w-none",
            "prose-headings:font-semibold prose-headings:tracking-tight",
            "prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4",
            "prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3",
            "prose-p:leading-relaxed prose-p:text-foreground/90",
            "prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
            "prose-blockquote:border-l-primary/30 prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
            "prose-img:rounded-lg prose-img:shadow-sm",
            "prose-code:before:content-none prose-code:after:content-none",
            "prose-pre:bg-muted prose-pre:rounded-lg",
            // Video player
            "[&_video]:w-full [&_video]:rounded-lg [&_video]:my-6",
            // YouTube iframe responsive
            "[&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-6",
            "[&_div[data-youtube-video]]:my-6",
          )}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Related playlists / courses */}
        {post.playlists.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground mb-6">
              <ListVideo className="h-5 w-5" />
              หลักสูตรที่เกี่ยวข้อง
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {post.playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlists/${pl.slug}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                    <div className="relative bg-muted" style={{ aspectRatio: "16/9" }}>
                      {pl.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pl.thumbnailUrl}
                          alt={pl.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Play className="h-8 w-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {pl.title}
                      </h3>
                      {pl.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {pl.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {pl.videoCount} บทเรียน
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <hr className="mt-12 border-border" />

        <div className="mt-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            กลับไปที่บทความทั้งหมด
          </Link>
        </div>
      </div>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt || post.title,
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            author: {
              "@type": "Person",
              name: post.author.name || "Admin",
            },
            ...(post.featuredImageUrl && { image: post.featuredImageUrl }),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </article>
  );
}
