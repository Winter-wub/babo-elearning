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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { revokeInviteLink } from "@/actions/invite.actions";
import { InviteStatusBadge } from "./invite-status-badge";
import { CreateInviteLinkDialog } from "./create-invite-link-dialog";
import { InviteDetailSheet } from "./invite-detail-sheet";
import type { PaginationMeta, InviteLinkRow } from "@/types";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Eye,
  Ban,
  Link as LinkIcon,
  Film,
  Check,
} from "lucide-react";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

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

interface InviteLinksManagerProps {
  invites: InviteLinkRow[];
  meta: PaginationMeta;
  videos: { id: string; title: string }[];
  currentSearch: string;
  currentStatusFilter: string;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function InviteLinksManager({
  invites,
  meta,
  videos,
  currentSearch,
  currentStatusFilter,
}: InviteLinksManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<InviteLinkRow | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Navigation helper
  const navigate = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      startTransition(() => {
        router.push(`/admin/invite-links?${sp.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  const handleSearch = () => {
    navigate({ search: search || undefined, page: undefined });
  };

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      status: e.target.value || undefined,
      page: undefined,
    });
  };

  const handleCopy = async (code: string, id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/register?invite=${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    const result = await revokeInviteLink(revokeTarget.id);
    setIsRevoking(false);
    setRevokeTarget(null);
    if (result.success) {
      toast({ title: "ยกเลิกลิงก์เชิญแล้ว" });
      router.refresh();
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="invite-toolbar">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อลิงก์..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={currentStatusFilter}
            onChange={handleStatusFilter}
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="expired">หมดอายุ</option>
            <option value="exhausted">ใช้ครบแล้ว</option>
            <option value="revoked">ถูกยกเลิก</option>
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          สร้างลิงก์เชิญ
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border" data-tour="invite-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อลิงก์</TableHead>
              <TableHead>วิดีโอ</TableHead>
              <TableHead>การใช้งาน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="hidden md:table-cell">หมดอายุ</TableHead>
              <TableHead className="hidden md:table-cell">สร้างเมื่อ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <LinkIcon className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground">ยังไม่มีลิงก์เชิญ</p>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      สร้างลิงก์แรก
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow
                  key={invite.id}
                  className={isPending ? "opacity-60" : undefined}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{invite.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {invite.code.slice(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="cursor-pointer gap-1"
                        >
                          <Film className="h-3 w-3" />
                          {invite.videoCount} วิดีโอ
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <ul className="space-y-1">
                          {videos
                            .filter((v) => invite.videoIds.includes(v.id))
                            .map((v) => (
                              <li
                                key={v.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Film className="h-3 w-3 shrink-0 text-muted-foreground" />
                                {v.title}
                              </li>
                            ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="tabular-nums text-sm">
                        {invite.currentRedemptions} /{" "}
                        {invite.maxRedemptions ?? "ไม่จำกัด"}
                      </span>
                      {invite.maxRedemptions && (
                        <div className="h-1 w-16 rounded-full bg-primary/20">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(100, (invite.currentRedemptions / invite.maxRedemptions) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <InviteStatusBadge status={invite.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={
                        invite.status === "expired"
                          ? "text-destructive line-through"
                          : undefined
                      }
                    >
                      {formatDate(invite.expiresAt)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(invite.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCopy(invite.code, invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <Check className="mr-2 h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          {copiedId === invite.id
                            ? "คัดลอกแล้ว"
                            : "คัดลอกลิงก์"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDetailId(invite.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        {invite.status === "active" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setRevokeTarget(invite)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              ยกเลิกลิงก์
                            </DropdownMenuItem>
                          </>
                        )}
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
            แสดง {invites.length} จาก {meta.total} รายการ
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page <= 1}
              onClick={() =>
                navigate({ page: String(meta.page - 1) })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page >= meta.totalPages}
              onClick={() =>
                navigate({ page: String(meta.page + 1) })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs / Sheets */}
      <CreateInviteLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        videos={videos}
      />

      <InviteDetailSheet
        inviteId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Revoke Confirmation */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกลิงก์?</DialogTitle>
            <DialogDescription>
              ลิงก์ &ldquo;{revokeTarget?.label}&rdquo;
              จะไม่สามารถใช้งานได้อีก
              นักเรียนที่สมัครไปแล้วจะยังคงมีสิทธิ์เดิม
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeTarget(null)}
              disabled={isRevoking}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  กำลังยกเลิก...
                </>
              ) : (
                "ยืนยันการยกเลิก"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
