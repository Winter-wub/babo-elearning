"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Search,
  Upload,
  Film,
  Loader2,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateVideo, deleteVideo } from "@/actions/video.actions";
import { formatDuration } from "@/lib/utils";
import type { Video } from "@/types";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface VideosTableProps {
  videos: Video[];
  meta: PaginationMeta;
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function VideosTable({ videos, meta }: VideosTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ---- URL-driven filter state ----
  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("isActive") ?? "true";
  const currentPage = Number(searchParams.get("page") ?? "1");

  // ---- Local transient state ----
  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const [isPending, startTransition] = React.useTransition();

  // ---- URL builder helpers ----
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `${pathname}?${params.toString()}`;
  }

  function pushParams(overrides: Record<string, string | undefined>) {
    router.push(buildUrl(overrides));
  }

  // Debounced search: update URL after user stops typing
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: value || undefined, page: "1" });
    }, 400);
  }

  // ---- Toggle active ----
  function handleToggleActive(video: Video) {
    startTransition(async () => {
      const result = await updateVideo(video.id, { isActive: !video.isActive });
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: video.isActive ? "ปิดใช้งานวิดีโอแล้ว" : "เปิดใช้งานวิดีโอแล้ว",
        description: `"${video.title}" ตอนนี้${video.isActive ? "ไม่ใช้งาน" : "ใช้งาน"}แล้ว`,
      });
    });
  }

  // ---- Toggle featured ----
  function handleToggleFeatured(video: Video) {
    startTransition(async () => {
      const result = await updateVideo(video.id, { isFeatured: !video.isFeatured });
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: video.isFeatured ? "นำออกจากรายการแนะนำ" : "ตั้งเป็นรายการแนะนำ",
        description: `"${video.title}" ตอนนี้${video.isFeatured ? "ไม่ได้เป็นรายการแนะนำ" : "เป็นรายการแนะนำ"}แล้ว`,
      });
    });
  }

  // ---- Soft delete ----
  function handleDelete(video: Video) {
    startTransition(async () => {
      const result = await deleteVideo(video.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      toast({
        title: "ปิดใช้งานวิดีโอแล้ว",
        description: `"${video.title}" ถูกปิดใช้งานแล้ว`,
      });
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4" data-testid="videos-table">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + filters */}
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาตามชื่อ..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select
            value={currentStatus}
            onValueChange={(v) =>
              pushParams({ isActive: v === "true" ? undefined : v, page: "1" })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="สถานะวิดีโอ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="true">ใช้งาน</SelectItem>
              <SelectItem value="false">ถูกลบ (ไม่ใช้งาน)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload video button */}
        <Button asChild className="shrink-0">
          <Link href="/admin/videos/upload">
            <Upload className="mr-2 h-4 w-4" />
            อัปโหลดวิดีโอ
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ภาพขนาดย่อ</TableHead>
              <TableHead>ชื่อเรื่อง</TableHead>
              <TableHead className="w-24">ความยาว</TableHead>
              <TableHead className="w-24">สถานะ</TableHead>
              <TableHead className="w-24">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  แนะนำ
                </span>
              </TableHead>
              <TableHead className="w-20">ยอดเข้าชม</TableHead>
              <TableHead className="w-36">วันที่อัปโหลด</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Film className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ไม่พบวิดีโอ</p>
                    <p className="text-xs">
                      {currentSearch || currentStatus
                        ? "ลองปรับการค้นหาหรือตัวกรอง"
                        : "อัปโหลดวิดีโอแรกของคุณเพื่อเริ่มต้น"}
                    </p>
                    {!currentSearch && !currentStatus && (
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/admin/videos/upload">
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                          อัปโหลดวิดีโอ
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              videos.map((video) => (
                <TableRow 
                  key={video.id} 
                  className={
                    isPending 
                      ? "opacity-60" 
                      : !video.isActive 
                      ? "bg-muted/50 opacity-60 grayscale-[0.5]" 
                      : undefined
                  }
                >
                  {/* Thumbnail */}
                  <TableCell>
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
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

                  {/* Title */}
                  <TableCell>
                    <Link
                      href={`/admin/videos/${video.id}`}
                      className="font-medium hover:underline"
                    >
                      {video.title}
                    </Link>
                    {video.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {video.description}
                      </p>
                    )}
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDuration(video.duration)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={video.isActive ? "outline" : "destructive"}
                      className={
                        video.isActive
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : undefined
                      }
                    >
                      {video.isActive ? "ใช้งาน" : "ถูกลบ"}
                    </Badge>
                  </TableCell>

                  {/* Featured toggle */}
                  <TableCell>
                    <Switch
                      checked={video.isFeatured ?? false}
                      onCheckedChange={() => handleToggleFeatured(video)}
                      disabled={isPending}
                      aria-label={`Toggle featured for ${video.title}`}
                    />
                  </TableCell>

                  {/* Views */}
                  <TableCell className="tabular-nums text-muted-foreground">
                    {(video.playCount ?? 0).toLocaleString()}
                  </TableCell>

                  {/* Upload date */}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(video.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>

                  {/* Row actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${video.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/videos/${video.id}`}>แก้ไข</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/videos/${video.id}`}>ดูรายละเอียด</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={
                            video.isActive
                              ? "text-amber-600 focus:text-amber-600"
                              : "text-green-600 focus:text-green-600"
                          }
                          onClick={() => handleToggleActive(video)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {video.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(video)}
                          disabled={isPending}
                        >
                          ลบ (ซอฟต์)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง{" "}
            <span className="font-medium">
              {(currentPage - 1) * meta.pageSize + 1}–
              {Math.min(currentPage * meta.pageSize, meta.total)}
            </span>{" "}
            จาก <span className="font-medium">{meta.total}</span> วิดีโอ
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isPending}
              onClick={() => pushParams({ page: String(currentPage - 1) })}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= meta.totalPages || isPending}
              onClick={() => pushParams({ page: String(currentPage + 1) })}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
