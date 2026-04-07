import Link from "next/link";
import type { Metadata } from "next";
import { PlayCircle, Video, Clock } from "lucide-react";
import { getPermittedVideos } from "@/actions/video.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "วิดีโอของฉัน",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function ExpiryIndicator({ validUntil }: { validUntil: Date }) {
  const now = new Date();
  const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;

  if (daysLeft <= 0) return null; // Already filtered out by getPermittedVideos, but just in case

  if (isExpiringSoon) {
    return (
      <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" />
        หมดอายุใน {daysLeft} วัน
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      เข้าถึงได้ถึง{" "}
      {validUntil.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </p>
  );
}

export default async function MyVideosPage() {
  const result = await getPermittedVideos();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            วิดีโอของฉัน
          </h1>
        </div>
        <p className="text-sm text-destructive">
          ไม่สามารถโหลดวิดีโอได้ กรุณาลองอีกครั้งภายหลัง
        </p>
      </div>
    );
  }

  const videos = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          วิดีโอของฉัน
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {videos.length > 0
            ? `คุณมีสิทธิ์เข้าถึง ${videos.length} วิดีโอ`
            : "คุณยังไม่มีสิทธิ์เข้าถึงวิดีโอใดๆ"}
        </p>
      </div>

      {videos.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link key={video.id} href={`/videos/${video.id}`} className="group block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
                      <PlayCircle className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-base group-hover:text-primary">
                    {video.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-1">
                  {video.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {video.description}
                    </p>
                  )}
                  {video.validUntil && (
                    <ExpiryIndicator validUntil={new Date(video.validUntil)} />
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
