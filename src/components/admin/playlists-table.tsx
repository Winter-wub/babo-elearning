"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Search,
  Plus,
  ListVideo,
  Loader2,
  Star,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updatePlaylist, deletePlaylist } from "@/actions/playlist.actions";
import type { PlaylistWithCount } from "@/actions/playlist.actions";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface PlaylistsTableProps {
  playlists: PlaylistWithCount[];
  meta: PaginationMeta;
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function PlaylistsTable({ playlists, meta }: PlaylistsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const currentSearch = searchParams.get("search") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const [isPending, startTransition] = React.useTransition();

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

  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: value || undefined, page: "1" });
    }, 400);
  }

  function handleToggleActive(playlist: PlaylistWithCount) {
    startTransition(async () => {
      const result = await updatePlaylist(playlist.id, {
        isActive: !playlist.isActive,
      });
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: playlist.isActive ? "ปิดใช้งานเพลย์ลิสต์แล้ว" : "เปิดใช้งานเพลย์ลิสต์แล้ว",
        description: `"${playlist.title}" ตอนนี้${playlist.isActive ? "ไม่ใช้งาน" : "ใช้งาน"}แล้ว`,
      });
    });
  }

  function handleToggleFeatured(playlist: PlaylistWithCount) {
    startTransition(async () => {
      const result = await updatePlaylist(playlist.id, {
        isFeatured: !playlist.isFeatured,
      });
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: playlist.isFeatured ? "นำออกจากรายการแนะนำ" : "ตั้งเป็นรายการแนะนำ",
      });
    });
  }

  function handleDelete(playlist: PlaylistWithCount) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${playlist.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    startTransition(async () => {
      const result = await deletePlaylist(playlist.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({ title: "ลบเพลย์ลิสต์แล้ว", description: `"${playlist.title}" ถูกลบแล้ว` });
    });
  }

  return (
    <div className="space-y-4" data-testid="playlists-table">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="playlists-toolbar">
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
        </div>

        <Button asChild className="shrink-0">
          <Link href="/admin/playlists/new">
            <Plus className="mr-2 h-4 w-4" />
            เพลย์ลิสต์ใหม่
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border" data-tour="playlists-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อเรื่อง</TableHead>
              <TableHead className="w-24">วิดีโอ</TableHead>
              <TableHead className="w-24">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  แนะนำ
                </span>
              </TableHead>
              <TableHead className="w-24">สถานะ</TableHead>
              <TableHead className="w-24">ลำดับ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {playlists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ListVideo className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ไม่พบเพลย์ลิสต์</p>
                    <p className="text-xs">
                      {currentSearch
                        ? "ลองปรับการค้นหา"
                        : "สร้างเพลย์ลิสต์แรกของคุณเพื่อเริ่มต้น"}
                    </p>
                    {!currentSearch && (
                      <Button asChild size="sm" className="mt-2">
                        <Link href="/admin/playlists/new">
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          เพลย์ลิสต์ใหม่
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              playlists.map((playlist) => (
                <TableRow
                  key={playlist.id}
                  className={isPending ? "opacity-60" : undefined}
                >
                  <TableCell>
                    <Link
                      href={`/admin/playlists/${playlist.id}`}
                      className="font-medium hover:underline"
                    >
                      {playlist.title}
                    </Link>
                    {playlist.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {playlist.description}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="tabular-nums text-muted-foreground">
                    {playlist._count.videos}
                  </TableCell>

                  <TableCell>
                    <Switch
                      checked={playlist.isFeatured}
                      onCheckedChange={() => handleToggleFeatured(playlist)}
                      disabled={isPending}
                      aria-label={`Toggle featured for ${playlist.title}`}
                    />
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={playlist.isActive ? "outline" : "destructive"}
                      className={
                        playlist.isActive
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : undefined
                      }
                    >
                      {playlist.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </Badge>
                  </TableCell>

                  <TableCell className="tabular-nums text-muted-foreground">
                    {playlist.sortOrder}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${playlist.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/playlists/${playlist.id}`}>
                            แก้ไข
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={
                            playlist.isActive
                              ? "text-amber-600 focus:text-amber-600"
                              : "text-green-600 focus:text-green-600"
                          }
                          onClick={() => handleToggleActive(playlist)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {playlist.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(playlist)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          ลบ
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
              {(currentPage - 1) * meta.pageSize + 1}
              {" - "}
              {Math.min(currentPage * meta.pageSize, meta.total)}
            </span>{" "}
            จาก <span className="font-medium">{meta.total}</span> เพลย์ลิสต์
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
