import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Key,
  Users,
  Video as VideoIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

import { VideoEditForm } from "@/components/admin/video-edit-form";
import { VideoMaterialsManager } from "@/components/admin/video-materials-manager";
import { VideoExercisesManager } from "@/components/admin/video-exercises-manager";
import { getVideoById } from "@/actions/video.actions";
import { getAdminMaterialsByVideoId } from "@/actions/material.actions";
import { getExercisesForVideo } from "@/actions/exercise.actions";
import { formatDuration } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface PageProps {
  params: Promise<{ videoId: string }>;
}

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { videoId } = await params;
  const result = await getVideoById(videoId);
  if (!result.success) return { title: "Video Not Found" };
  return { title: `${result.data.title} — Edit Video` };
}

// -----------------------------------------------------------------------
// Sub-component: read-only details card
// -----------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sub-component: permissions list
// -----------------------------------------------------------------------

async function VideoPermissionsList({ videoId }: { videoId: string }) {
  const result = await getVideoById(videoId);
  if (!result.success) return null;

  const { permissions } = result.data;

  if (permissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Access Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No users have been granted access to this video yet.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/admin/users">Manage User Permissions</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Access Permissions
          <Badge variant="secondary" className="ml-auto font-mono text-xs">
            {permissions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y text-sm">
          {permissions.map((permission) => (
            <li
              key={permission.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{permission.user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {permission.user.email}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  Granted{" "}
                  {new Date(permission.grantedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <Button asChild size="sm" variant="ghost" className="mt-0.5 h-6 px-2 text-xs">
                  <Link href={`/admin/users/${permission.user.id}`}>
                    View User
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t pt-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">Manage User Permissions</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Sub-component: video details card (server-fetched)
// -----------------------------------------------------------------------

async function VideoDetailsCard({ videoId }: { videoId: string }) {
  const result = await getVideoById(videoId);
  if (!result.success) notFound();

  const video = result.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-xl leading-snug">{video.title}</CardTitle>
          <Badge
            variant={video.isActive ? "outline" : "destructive"}
            className={
              video.isActive
                ? "shrink-0 border-green-500 text-green-600 dark:text-green-400"
                : "shrink-0"
            }
          >
            {video.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {video.description && (
          <p className="mt-1 text-sm text-muted-foreground">{video.description}</p>
        )}
      </CardHeader>

      <CardContent className="divide-y">
        <InfoRow
          icon={<Clock className="h-4 w-4" />}
          label="Duration"
          value={
            <span className="tabular-nums">
              {formatDuration(video.duration)}{" "}
              <span className="font-normal text-muted-foreground">
                ({video.duration}s)
              </span>
            </span>
          }
        />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Uploaded"
          value={new Date(video.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <InfoRow
          icon={<Calendar className="h-4 w-4" />}
          label="Last updated"
          value={new Date(video.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <InfoRow
          icon={<Key className="h-4 w-4" />}
          label="Storage key (s3Key)"
          value={
            <code className="max-w-xs truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {video.s3Key}
            </code>
          }
        />
        {(video.thumbnailKey || video.thumbnailUrl) && (
          <InfoRow
            icon={<VideoIcon className="h-4 w-4" />}
            label="Thumbnail"
            value={
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.thumbnailKey ? `/api/thumbnails/${video.thumbnailKey}` : video.thumbnailUrl!}
                alt={`Thumbnail for ${video.title}`}
                className="h-14 w-24 rounded object-cover"
              />
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------
// Sub-component: edit form (server-fetches video, hands to client form)
// -----------------------------------------------------------------------

async function EditFormSection({ videoId }: { videoId: string }) {
  const result = await getVideoById(videoId);
  if (!result.success) return null;

  return <VideoEditForm video={result.data} />;
}

// -----------------------------------------------------------------------
// Sub-component: course materials manager (server-fetched initial data)
// -----------------------------------------------------------------------

async function MaterialsSection({ videoId }: { videoId: string }) {
  const result = await getAdminMaterialsByVideoId(videoId);
  const materials = result.success ? result.data : [];

  return (
    <VideoMaterialsManager videoId={videoId} initialMaterials={materials} />
  );
}

// -----------------------------------------------------------------------
// Sub-component: exercises manager (server-fetched initial data)
// -----------------------------------------------------------------------

async function ExercisesSection({ videoId }: { videoId: string }) {
  const result = await getExercisesForVideo(videoId);
  const exercises = result.success ? result.data : [];

  return (
    <VideoExercisesManager videoId={videoId} initialExercises={exercises} />
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default async function AdminVideoDetailPage({ params }: PageProps) {
  const { videoId } = await params;

  // Eagerly check existence so we can show notFound() before streaming starts.
  const prefetch = await getVideoById(videoId);
  if (!prefetch.success) notFound();

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/videos">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Videos
          </Link>
        </Button>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left column: details + edit form */}
        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <VideoDetailsCard videoId={videoId} />
          </Suspense>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <EditFormSection videoId={videoId} />
          </Suspense>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <MaterialsSection videoId={videoId} />
          </Suspense>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <ExercisesSection videoId={videoId} />
          </Suspense>
        </div>

        {/* Right column: permissions */}
        <div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            }
          >
            <VideoPermissionsList videoId={videoId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
