"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Plus,
  Trash2,
  Film,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/utils";
import {
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylistVideos,
} from "@/actions/playlist.actions";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number;
}

interface CurrentVideo extends VideoItem {
  position: number;
}

interface PlaylistVideosManagerProps {
  playlistId: string;
  currentVideos: CurrentVideo[];
  availableVideos: VideoItem[];
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function PlaylistVideosManager({
  playlistId,
  currentVideos,
  availableVideos,
}: PlaylistVideosManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [searchAvailable, setSearchAvailable] = React.useState("");

  const filteredAvailable = availableVideos.filter((v) =>
    v.title.toLowerCase().includes(searchAvailable.toLowerCase())
  );

  function handleAddVideo(videoId: string) {
    startTransition(async () => {
      const position = currentVideos.length;
      const result = await addVideoToPlaylist(playlistId, videoId, position);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({ title: "เพิ่มวิดีโอลงเพลย์ลิสต์แล้ว" });
    });
  }

  function handleRemoveVideo(videoId: string) {
    startTransition(async () => {
      const result = await removeVideoFromPlaylist(playlistId, videoId);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({ title: "ลบวิดีโอออกจากเพลย์ลิสต์แล้ว" });
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...currentVideos];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorder(newOrder);
  }

  function handleMoveDown(index: number) {
    if (index === currentVideos.length - 1) return;
    const newOrder = [...currentVideos];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorder(newOrder);
  }

  function reorder(newOrder: CurrentVideo[]) {
    startTransition(async () => {
      const videoIds = newOrder.map((v) => v.id);
      const result = await reorderPlaylistVideos(playlistId, videoIds);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({ title: "จัดลำดับวิดีโอใหม่แล้ว" });
    });
  }

  return (
    <div className="space-y-6">
      {/* Current playlist videos */}
      <Card>
        <CardHeader>
          <CardTitle>วิดีโอในเพลย์ลิสต์</CardTitle>
          <CardDescription>
            {currentVideos.length} วิดีโอในเพลย์ลิสต์นี้ ใช้ลูกศรเพื่อจัดลำดับใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentVideos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Film className="h-8 w-8 opacity-40" />
              <p className="text-sm">ยังไม่มีวิดีโอในเพลย์ลิสต์นี้</p>
              <p className="text-xs">เพิ่มวิดีโอจากส่วนด้านล่าง</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-16">ภาพย่อ</TableHead>
                    <TableHead>ชื่อเรื่อง</TableHead>
                    <TableHead className="w-24">ความยาว</TableHead>
                    <TableHead className="w-28">จัดลำดับ</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentVideos.map((video, index) => (
                    <TableRow
                      key={video.id}
                      className={isPending ? "opacity-60" : undefined}
                    >
                      <TableCell className="text-muted-foreground">
                        <GripVertical className="inline h-4 w-4 mr-1 opacity-40" />
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={`Thumbnail for ${video.title}`}
                            className="h-9 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-16 items-center justify-center rounded bg-muted">
                            <Film className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {video.title}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDuration(video.duration)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === 0 || isPending}
                            onClick={() => handleMoveUp(index)}
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={
                              index === currentVideos.length - 1 || isPending
                            }
                            onClick={() => handleMoveDown(index)}
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isPending}
                          onClick={() => handleRemoveVideo(video.id)}
                          aria-label={`Remove ${video.title}`}
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available videos to add */}
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มวิดีโอ</CardTitle>
          <CardDescription>
            เลือกวิดีโอเพื่อเพิ่มลงในเพลย์ลิสต์นี้
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="ค้นหาวิดีโอที่มี..."
            value={searchAvailable}
            onChange={(e) => setSearchAvailable(e.target.value)}
          />

          {filteredAvailable.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Film className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                {availableVideos.length === 0
                  ? "วิดีโอทั้งหมดอยู่ในเพลย์ลิสต์นี้แล้ว"
                  : "ไม่พบวิดีโอที่ตรงกับการค้นหา"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ภาพย่อ</TableHead>
                    <TableHead>ชื่อเรื่อง</TableHead>
                    <TableHead className="w-24">ความยาว</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvailable.slice(0, 20).map((video) => (
                    <TableRow
                      key={video.id}
                      className={isPending ? "opacity-60" : undefined}
                    >
                      <TableCell>
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={`Thumbnail for ${video.title}`}
                            className="h-9 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-16 items-center justify-center rounded bg-muted">
                            <Film className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {video.title}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDuration(video.duration)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending}
                          onClick={() => handleAddVideo(video.id)}
                          aria-label={`Add ${video.title}`}
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAvailable.length > 20 && (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  แสดง 20 จาก {filteredAvailable.length} วิดีโอ ใช้การค้นหาเพื่อจำกัดผลลัพธ์
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
