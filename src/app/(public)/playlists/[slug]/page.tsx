import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Clock,
  Play,
  ListVideo,
  Users,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { LineIcon } from "@/components/icons/line-icon";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlaylistBySlug } from "@/actions/playlist.actions";
import { getVideoExerciseStatus } from "@/actions/exercise.actions";
import { getSiteContent } from "@/actions/content.actions";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/shared/price-display";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { DemoVideoSection } from "@/components/courses/demo-video-section";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDuration, isSafeHref } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicPlaylistPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PublicPlaylistPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPlaylistBySlug(slug);

  if (!result.success || !result.data) {
    return { title: "ไม่พบหลักสูตร" };
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PublicPlaylistPage({
  params,
}: PublicPlaylistPageProps) {
  const { slug } = await params;
  const [result, session] = await Promise.all([
    getPlaylistBySlug(slug),
    auth(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const playlist = result.data;
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;
  const videoCount = playlist.videos.length;

  // Check if this playlist has a paid product
  const product = await db.product.findUnique({
    where: { playlistId: playlist.id },
    select: { id: true, priceSatang: true, salePriceSatang: true, isActive: true },
  });

  // Check if user already owns all videos in this playlist
  let hasAllPermissions = false;
  if (userId && videoCount > 0) {
    const ownedCount = await db.videoPermission.count({
      where: {
        userId,
        videoId: { in: playlist.videos.map((pv) => pv.video.id) },
      },
    });
    hasAllPermissions = ownedCount >= videoCount;
  }

  // Check if product is already in user's cart
  let isInCart = false;
  if (userId && product) {
    const cartItem = await db.cartItem.findFirst({
      where: { cart: { userId }, productId: product.id },
    });
    isInCart = !!cartItem;
  }

  // Fetch LINE URL from CMS + demo video pre-test status
  const lineContent = await getSiteContent(["contact.line.url"]);
  const rawLineUrl = lineContent["contact.line.url"] || "";
  const lineUrl = isSafeHref(rawLineUrl) ? rawLineUrl : "";

  let demoPreTest: { exerciseId: string; title: string } | null = null;
  if (playlist.demoVideo && isAuthenticated) {
    const exerciseResult = await getVideoExerciseStatus(playlist.demoVideo.id);
    if (exerciseResult.success && exerciseResult.data.preTest) {
      demoPreTest = {
        exerciseId: exerciseResult.data.preTest.exerciseId,
        title: exerciseResult.data.preTest.title,
      };
    }
  }

  const isPaidProduct = product?.isActive && product.priceSatang > 0;
  const totalSeconds = playlist.videos.reduce(
    (sum, pv) => sum + pv.video.duration,
    0
  );
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMins = Math.floor((totalSeconds % 3600) / 60);
  const durationLabel =
    totalHours > 0 ? `${totalHours} ชม. ${totalMins} นาที` : `${totalMins} นาที`;
  const totalViews = playlist.videos.reduce(
    (sum, pv) => sum + pv.video.playCount,
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าหลัก
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Main content (left 2/3) ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero / Demo Video or Thumbnail */}
          {playlist.demoVideo ? (
            <DemoVideoSection
              demoVideo={playlist.demoVideo}
              isAuthenticated={isAuthenticated}
              preTest={demoPreTest}
              lineUrl={lineUrl || undefined}
              playlistSlug={playlist.slug}
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              {playlist.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playlist.thumbnailUrl}
                  alt={playlist.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-muted">
                  <Play className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>
          )}

          {/* Title & description */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {playlist.title}
            </h1>
            {playlist.description && (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {playlist.description}
              </p>
            )}
          </div>

          {/* ── Curriculum list ── */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <BookOpen className="h-5 w-5" />
              เนื้อหาหลักสูตร
              <span className="text-sm font-normal text-muted-foreground">
                ({videoCount} บทเรียน)
              </span>
            </h2>

            <div className="divide-y rounded-xl border bg-card">
              {playlist.videos.map(({ position, video }) => {
                const videoHref = isAuthenticated
                  ? `/videos/${video.id}`
                  : `/login?callbackUrl=${encodeURIComponent(`/videos/${video.id}`)}`;

                return (
                  <Link
                    key={video.id}
                    href={videoHref}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    {/* Position */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {position}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {video.description}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDuration(video.duration)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Sidebar (right 1/3) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Enroll / CTA card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">เริ่มเรียนหลักสูตรนี้</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasAllPermissions ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/playlists/${playlist.slug}`}>
                      เข้าเรียนเลย
                    </Link>
                  </Button>
                ) : isPaidProduct ? (
                  <>
                    <div className="text-center">
                      <PriceDisplay
                        priceSatang={product.priceSatang}
                        salePriceSatang={product.salePriceSatang}
                        className="text-lg"
                      />
                    </div>
                    {isAuthenticated ? (
                      <AddToCartButton
                        productId={product.id}
                        isInCart={isInCart}
                        className="w-full"
                      />
                    ) : (
                      <Button asChild className="w-full" size="lg">
                        <Link
                          href={`/login?callbackUrl=${encodeURIComponent(`/playlists/${playlist.slug}`)}`}
                        >
                          เข้าสู่ระบบเพื่อซื้อคอร์ส
                        </Link>
                      </Button>
                    )}
                  </>
                ) : isAuthenticated ? (
                  <Button asChild className="w-full" size="lg">
                    <Link href={`/playlists/${playlist.slug}`}>
                      เข้าเรียนเลย
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full" size="lg">
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/playlists/${playlist.slug}`)}`}
                    >
                      เข้าสู่ระบบเพื่อเรียน
                    </Link>
                  </Button>
                )}

                {lineUrl && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755] hover:text-white"
                    size="lg"
                  >
                    <a href={lineUrl} target="_blank" rel="noopener noreferrer">
                      <LineIcon className="h-4 w-4" />
                      สอบถามเพิ่มเติม
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Course composition */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">รายละเอียดหลักสูตร</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <ListVideo className="h-4 w-4" />
                      จำนวนบทเรียน
                    </dt>
                    <dd className="font-medium">{videoCount} บท</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      ระยะเวลาเรียน
                    </dt>
                    <dd className="font-medium">{durationLabel}</dd>
                  </div>
                  {totalViews > 0 && (
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        ผู้เข้าชม
                      </dt>
                      <dd className="font-medium">
                        {totalViews.toLocaleString()} ครั้ง
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
