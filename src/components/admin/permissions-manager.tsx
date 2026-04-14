"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  bulkGrantPermissionsMulti,
  bulkRevokePermissionsByIds,
} from "@/actions/permission.actions";
import type { PaginationMeta, SafePermissionRow } from "@/types";
import type { PermissionTimeConfig, PermissionTimeStatus } from "@/lib/permission-utils";
import {
  Search,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  CircleCheck,
  CircleX,
  Clock,
  Infinity,
  Info,
} from "lucide-react";
import { PermissionTypeSelector } from "./permission-type-selector";
import { DurationPicker } from "./duration-picker";
import { DateRangePicker } from "./date-range-picker";
import { PermissionEditSheet } from "./permission-edit-sheet";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function StatusBadge({ status }: { status: PermissionTimeStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="h-3 w-3" />
          ใช้งาน
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1">
          <CircleX className="h-3 w-3" />
          หมดอายุ
        </Badge>
      );
    case "not_yet_active":
      return (
        <Badge className="gap-1 border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          กำหนดเวลา
        </Badge>
      );
    case "permanent":
      return (
        <Badge variant="outline" className="gap-1">
          <Infinity className="h-3 w-3" />
          ถาวร
        </Badge>
      );
  }
}

function formatDate(date: Date | null) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface PermissionsManagerProps {
  permissions: SafePermissionRow[];
  meta: PaginationMeta;
  users: { id: string; name: string | null; email: string }[];
  videos: { id: string; title: string }[];
  currentSearch: string;
  currentVideoFilter: string;
  currentStatusFilter: string;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function PermissionsManager({
  permissions,
  meta,
  users,
  videos,
  currentSearch,
  currentVideoFilter,
  currentStatusFilter,
}: PermissionsManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [search, setSearch] = useState(currentSearch);

  // Grant dialog state
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserIds, setGrantUserIds] = useState<Set<string>>(new Set());
  const [grantVideoIds, setGrantVideoIds] = useState<Set<string>>(new Set());
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [videoSearchTerm, setVideoSearchTerm] = useState("");

  // Grant dialog — time config
  const [grantMode, setGrantMode] = useState<"permanent" | "relative" | "absolute">("permanent");
  const [grantDuration, setGrantDuration] = useState(30);
  const [grantStartDate, setGrantStartDate] = useState<Date | undefined>();
  const [grantEndDate, setGrantEndDate] = useState<Date | undefined>();

  // Edit sheet state
  const [editPerm, setEditPerm] = useState<SafePermissionRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Navigation helpers
  // -----------------------------------------------------------------------

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (!updates.page) {
        params.delete("page");
      }
      router.push(`/admin/permissions?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(() => {
    updateParams({ search: search || undefined });
  }, [search, updateParams]);

  const handleVideoFilter = useCallback(
    (videoId: string) => {
      updateParams({ videoId: videoId || undefined });
    },
    [updateParams],
  );

  const handleStatusFilter = useCallback(
    (status: string) => {
      updateParams({ status: status || undefined });
    },
    [updateParams],
  );

  // -----------------------------------------------------------------------
  // Selection
  // -----------------------------------------------------------------------

  const allSelected =
    permissions.length > 0 &&
    permissions.every((p) => selectedIds.has(p.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(permissions.map((p) => p.id)));
    }
  }, [allSelected, permissions]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // -----------------------------------------------------------------------
  // Bulk Revoke
  // -----------------------------------------------------------------------

  const handleBulkRevoke = useCallback(() => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await bulkRevokePermissionsByIds(
        Array.from(selectedIds),
      );
      if (result.success) {
        toast({
          title: "เพิกถอนสิทธิ์แล้ว",
          description: `เพิกถอน ${result.data.count} สิทธิ์แล้ว`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }, [selectedIds, router, toast]);

  // -----------------------------------------------------------------------
  // Build time config from grant dialog state
  // -----------------------------------------------------------------------

  function buildTimeConfig(): PermissionTimeConfig {
    if (grantMode === "relative") {
      return { mode: "relative", durationDays: grantDuration };
    }
    if (grantMode === "absolute" && grantStartDate && grantEndDate) {
      return { mode: "absolute", validFrom: grantStartDate, validUntil: grantEndDate };
    }
    return { mode: "permanent" };
  }

  // -----------------------------------------------------------------------
  // Bulk Grant
  // -----------------------------------------------------------------------

  const handleBulkGrant = useCallback(() => {
    if (grantUserIds.size === 0 || grantVideoIds.size === 0) return;

    if (grantMode === "absolute") {
      if (!grantStartDate || !grantEndDate || grantEndDate <= grantStartDate) {
        toast({ variant: "destructive", title: "ช่วงวันที่ไม่ถูกต้อง" });
        return;
      }
    }

    const timeConfig = buildTimeConfig();

    startTransition(async () => {
      const result = await bulkGrantPermissionsMulti(
        Array.from(grantUserIds),
        Array.from(grantVideoIds),
        timeConfig,
      );
      if (result.success) {
        toast({
          title: "ให้สิทธิ์แล้ว",
          description: `ให้สิทธิ์ใหม่ ${result.data.count} รายการแล้ว`,
        });
        setGrantOpen(false);
        setGrantUserIds(new Set());
        setGrantVideoIds(new Set());
        setGrantMode("permanent");
        setGrantStartDate(undefined);
        setGrantEndDate(undefined);
        router.refresh();
      } else {
        toast({
          title: "ข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }, [grantUserIds, grantVideoIds, grantMode, grantDuration, grantStartDate, grantEndDate, router, toast]);

  // -----------------------------------------------------------------------
  // Grant dialog toggle helpers
  // -----------------------------------------------------------------------

  const toggleGrantUser = useCallback((id: string) => {
    setGrantUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGrantVideo = useCallback((id: string) => {
    setGrantVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!userSearchTerm) return true;
    const term = userSearchTerm.toLowerCase();
    return (
      (u.name?.toLowerCase().includes(term) ?? false) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const filteredVideos = videos.filter((v) => {
    if (!videoSearchTerm) return true;
    return v.title.toLowerCase().includes(videoSearchTerm.toLowerCase());
  });

  // -----------------------------------------------------------------------
  // Summary text for grant dialog
  // -----------------------------------------------------------------------

  const grantSummary = (() => {
    const count = grantUserIds.size * grantVideoIds.size;
    let suffix = "เข้าถึงถาวร";
    if (grantMode === "relative") suffix = `หมดอายุหลังจาก ${grantDuration} วัน`;
    if (grantMode === "absolute" && grantStartDate && grantEndDate)
      suffix = `ใช้งานได้ ${grantStartDate.toLocaleDateString()} ถึง ${grantEndDate.toLocaleDateString()}`;
    return `${grantUserIds.size} ผู้ใช้ \u00d7 ${grantVideoIds.size} วิดีโอ = ${count} สิทธิ์ \u2014 ${suffix}`;
  })();

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="permissions-toolbar">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยชื่อหรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-64 pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            ค้นหา
          </Button>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={currentVideoFilter}
            onChange={(e) => handleVideoFilter(e.target.value)}
          >
            <option value="">วิดีโอทั้งหมด</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={currentStatusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="active">ใช้งาน</option>
            <option value="expired">หมดอายุ</option>
            <option value="not_yet_active">กำหนดเวลา</option>
            <option value="permanent">ถาวร</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkRevoke}
              disabled={isPending}
            >
              {isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              เพิกถอนที่เลือก ({selectedIds.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ให้สิทธิ์
          </Button>
        </div>
      </div>

      {/* Permissions table */}
      <div className="overflow-x-auto rounded-md border" data-tour="permissions-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>วิดีโอ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>หมดอายุ</TableHead>
              <TableHead className="hidden md:table-cell">ให้สิทธิ์เมื่อ</TableHead>
              <TableHead className="hidden md:table-cell">ให้สิทธิ์โดย</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  ไม่พบสิทธิ์การเข้าถึง
                </TableCell>
              </TableRow>
            ) : (
              permissions.map((p) => (
                <TableRow
                  key={p.id}
                  data-state={selectedIds.has(p.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => toggleOne(p.id)}
                      aria-label={`Select permission for ${p.user.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.user.name || "ไม่ระบุชื่อ"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{p.video.title}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.validUntil ? (
                      <span className={p.status === "expired" ? "text-destructive line-through" : ""}>
                        {formatDate(p.validUntil)}
                      </span>
                    ) : (
                      "\u2014"
                    )}
                    {p.validFrom && p.status === "not_yet_active" && (
                      <p className="text-xs">เริ่ม: {formatDate(p.validFrom)}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {formatDate(p.grantedAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {p.grantedBy ?? "ระบบ"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditPerm(p);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          แก้ไขวันหมดอายุ
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            startTransition(async () => {
                              const result = await bulkRevokePermissionsByIds([p.id]);
                              if (result.success) {
                                toast({ title: "เพิกถอนสิทธิ์แล้ว" });
                                router.refresh();
                              } else {
                                toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
                              }
                            });
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          เพิกถอน
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
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {(meta.page - 1) * meta.pageSize + 1} ถึง{" "}
            {Math.min(meta.page * meta.pageSize, meta.total)} จาก {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() =>
                updateParams({ page: String(meta.page - 1) })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              หน้า {meta.page} จาก {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() =>
                updateParams({ page: String(meta.page + 1) })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Grant permissions dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>ให้สิทธิ์</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* User selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  ผู้ใช้ (เลือก {grantUserIds.size})
                </h3>
              </div>
              <Input
                placeholder="ค้นหาผู้ใช้..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="h-8"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredUsers.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    ไม่พบผู้ใช้
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={grantUserIds.has(u.id)}
                        onCheckedChange={() => toggleGrantUser(u.id)}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {u.name || "ไม่ระบุชื่อ"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Video selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  วิดีโอ (เลือก {grantVideoIds.size})
                </h3>
              </div>
              <Input
                placeholder="ค้นหาวิดีโอ..."
                value={videoSearchTerm}
                onChange={(e) => setVideoSearchTerm(e.target.value)}
                className="h-8"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredVideos.length === 0 ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    ไม่พบวิดีโอ
                  </p>
                ) : (
                  filteredVideos.map((v) => (
                    <label
                      key={v.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={grantVideoIds.has(v.id)}
                        onCheckedChange={() => toggleGrantVideo(v.id)}
                      />
                      <p className="truncate text-sm">{v.title}</p>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Access Duration section */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">ระยะเวลาการเข้าถึง</h3>
            <PermissionTypeSelector value={grantMode} onChange={setGrantMode} />

            {grantMode === "relative" && (
              <DurationPicker value={grantDuration} onChange={setGrantDuration} />
            )}
            {grantMode === "absolute" && (
              <DateRangePicker
                startDate={grantStartDate}
                endDate={grantEndDate}
                onStartChange={setGrantStartDate}
                onEndChange={setGrantEndDate}
              />
            )}
            {grantMode === "permanent" && (
              <p className="text-sm text-muted-foreground">
                ไม่มีวันหมดอายุ &mdash; นักเรียนจะเข้าถึงได้ตลอดจนกว่าจะเพิกถอน
              </p>
            )}

            {/* Summary bar */}
            {(grantUserIds.size > 0 || grantVideoIds.size > 0) && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{grantSummary}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleBulkGrant}
              disabled={
                isPending ||
                grantUserIds.size === 0 ||
                grantVideoIds.size === 0
              }
            >
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              ให้สิทธิ์ ({grantUserIds.size} &times; {grantVideoIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit permission sheet */}
      <PermissionEditSheet
        permission={editPerm}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
