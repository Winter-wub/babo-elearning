"use client";

import * as React from "react";
import { Search, CheckCheck, XCircle, Loader2, Film } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Video } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import {
  grantPermission,
  revokePermission,
  bulkGrantPermissions,
  bulkRevokePermissions,
} from "@/actions/permission.actions";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type VideoWithPermission = Video & { hasPermission: boolean };

interface UserPermissionsProps {
  userId: string;
  videos: VideoWithPermission[];
}

// Optimistic state: track per-video optimistic overrides
type OptimisticAction =
  | { type: "toggle"; videoId: string; value: boolean }
  | { type: "grant_all" }
  | { type: "revoke_all" };

function permissionsReducer(
  state: VideoWithPermission[],
  action: OptimisticAction
): VideoWithPermission[] {
  switch (action.type) {
    case "toggle":
      return state.map((v) =>
        v.id === action.videoId ? { ...v, hasPermission: action.value } : v
      );
    case "grant_all":
      return state.map((v) => ({ ...v, hasPermission: true }));
    case "revoke_all":
      return state.map((v) => ({ ...v, hasPermission: false }));
    default:
      return state;
  }
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function UserPermissions({ userId, videos }: UserPermissionsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Optimistic state layered on top of server data
  const [optimisticVideos, applyOptimistic] = React.useOptimistic(
    videos,
    permissionsReducer
  );

  const [search, setSearch] = React.useState("");
  const [bulkConfirm, setBulkConfirm] = React.useState<"grant" | "revoke" | null>(null);

  // ---- Derived ----
  const filtered = React.useMemo(
    () =>
      optimisticVideos.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase())
      ),
    [optimisticVideos, search]
  );

  const grantedCount = optimisticVideos.filter((v) => v.hasPermission).length;

  // ---- Single toggle ----
  function handleToggle(video: VideoWithPermission) {
    const newValue = !video.hasPermission;

    startTransition(async () => {
      applyOptimistic({ type: "toggle", videoId: video.id, value: newValue });

      const result = newValue
        ? await grantPermission(userId, video.id)
        : await revokePermission(userId, video.id);

      if (!result.success) {
        // Revert via server data on next render; show error
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    });
  }

  // ---- Bulk grant ----
  function handleGrantAll() {
    const toGrant = optimisticVideos
      .filter((v) => !v.hasPermission)
      .map((v) => v.id);

    if (toGrant.length === 0) {
      toast({ title: "All videos already granted." });
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "grant_all" });
      setBulkConfirm(null);

      const result = await bulkGrantPermissions(userId, toGrant);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Bulk grant failed",
          description: result.error,
        });
      } else {
        toast({
          title: "All videos granted",
          description: `${result.data.count} permission(s) added.`,
        });
      }
    });
  }

  // ---- Bulk revoke ----
  function handleRevokeAll() {
    const toRevoke = optimisticVideos
      .filter((v) => v.hasPermission)
      .map((v) => v.id);

    if (toRevoke.length === 0) {
      toast({ title: "No permissions to revoke." });
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "revoke_all" });
      setBulkConfirm(null);

      const result = await bulkRevokePermissions(userId, toRevoke);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Bulk revoke failed",
          description: result.error,
        });
      } else {
        toast({
          title: "All permissions revoked",
          description: `${result.data.count} permission(s) removed.`,
        });
      }
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Video Permissions</h2>
          <Badge variant="secondary">
            {grantedCount} / {optimisticVideos.length} granted
          </Badge>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkConfirm("grant")}
            disabled={isPending}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Grant All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkConfirm("revoke")}
            disabled={isPending}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Revoke All
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter videos…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Video list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-16 text-muted-foreground">
          <Film className="h-10 w-10 opacity-40" />
          <p className="text-sm">
            {search ? "No videos match your search." : "No videos available."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((video) => (
            <Card
              key={video.id}
              className={`transition-colors ${
                video.hasPermission ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {/* Thumbnail placeholder */}
                <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {video.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-snug" title={video.title}>
                    {video.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDuration(video.duration)}
                  </p>
                </div>

                {/* Toggle */}
                <div className="shrink-0">
                  <Label htmlFor={`perm-${video.id}`} className="sr-only">
                    {video.hasPermission ? "Revoke access" : "Grant access"}
                  </Label>
                  <Switch
                    id={`perm-${video.id}`}
                    checked={video.hasPermission}
                    onCheckedChange={() => handleToggle(video)}
                    disabled={isPending}
                    aria-label={
                      video.hasPermission
                        ? `Revoke access to ${video.title}`
                        : `Grant access to ${video.title}`
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk confirmation dialog */}
      <Dialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkConfirm === "grant" ? "Grant All Permissions" : "Revoke All Permissions"}
            </DialogTitle>
            <DialogDescription>
              {bulkConfirm === "grant"
                ? "This will grant this user access to every active video on the platform."
                : "This will remove this user's access to all videos. They will no longer be able to watch any content."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={bulkConfirm === "revoke" ? "destructive" : "default"}
              onClick={bulkConfirm === "grant" ? handleGrantAll : handleRevokeAll}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkConfirm === "grant" ? "Grant All" : "Revoke All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

