"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  MoreHorizontal,
  Mail,
  MailOpen,
  Trash2,
  Loader2,
  Inbox,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  markSubmissionRead,
  deleteSubmission,
} from "@/actions/contact.actions";
import type { ContactSubmission } from "@prisma/client";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface ContactsTableProps {
  submissions: ContactSubmission[];
  meta: PaginationMeta;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function ContactsTable({ submissions, meta }: ContactsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const currentFilter = searchParams.get("filter") ?? "all";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [isPending, startTransition] = React.useTransition();
  const [viewingSubmission, setViewingSubmission] =
    React.useState<ContactSubmission | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingSubmission, setDeletingSubmission] =
    React.useState<ContactSubmission | null>(null);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "" || value === "all") {
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

  function handleToggleRead(submission: ContactSubmission) {
    startTransition(async () => {
      const result = await markSubmissionRead(
        submission.id,
        !submission.isRead
      );
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      router.refresh();
      toast({
        title: submission.isRead ? "ทำเครื่องหมายว่ายังไม่ได้อ่าน" : "ทำเครื่องหมายว่าอ่านแล้ว",
      });
    });
  }

  function handleViewSubmission(submission: ContactSubmission) {
    setViewingSubmission(submission);
    // Auto-mark as read when viewing
    if (!submission.isRead) {
      startTransition(async () => {
        await markSubmissionRead(submission.id, true);
        router.refresh();
      });
    }
  }

  function handleOpenDelete(submission: ContactSubmission) {
    setDeletingSubmission(submission);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!deletingSubmission) return;
    startTransition(async () => {
      const result = await deleteSubmission(deletingSubmission.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      toast({ title: "ลบข้อความแล้ว" });
      setDeleteDialogOpen(false);
      setDeletingSubmission(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="contacts-table">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-tour="contacts-toolbar">
        <Select
          value={currentFilter}
          onValueChange={(v) => pushParams({ filter: v, page: "1" })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ข้อความทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ข้อความทั้งหมด</SelectItem>
            <SelectItem value="unread">ยังไม่ได้อ่าน</SelectItem>
            <SelectItem value="read">อ่านแล้ว</SelectItem>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground">
          {meta.total} ข้อความ
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border" data-tour="contacts-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>เรื่อง</TableHead>
              <TableHead className="w-36">วันที่</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ไม่พบข้อความ</p>
                    <p className="text-xs">
                      {currentFilter !== "all"
                        ? "ลองเปลี่ยนตัวกรอง"
                        : "ยังไม่ได้รับข้อความจากแบบฟอร์มติดต่อ"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <TableRow
                  key={submission.id}
                  className={`${isPending ? "opacity-60" : ""} ${
                    !submission.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <TableCell>
                    {submission.isRead ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="font-medium hover:underline text-left"
                      onClick={() => handleViewSubmission(submission)}
                    >
                      {submission.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {submission.email}
                  </TableCell>
                  <TableCell>
                    <p className="line-clamp-1">{submission.subject}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(submission.createdAt).toLocaleDateString(
                      "th-TH",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${submission.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleViewSubmission(submission)}
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleRead(submission)}
                          disabled={isPending}
                        >
                          {submission.isRead ? (
                            <>
                              <Mail className="mr-2 h-3.5 w-3.5" />
                              ทำเครื่องหมายว่ายังไม่ได้อ่าน
                            </>
                          ) : (
                            <>
                              <MailOpen className="mr-2 h-3.5 w-3.5" />
                              ทำเครื่องหมายว่าอ่านแล้ว
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleOpenDelete(submission)}
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
            จาก <span className="font-medium">{meta.total}</span>
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

      {/* View Details Dialog */}
      <Dialog
        open={!!viewingSubmission}
        onOpenChange={(open) => {
          if (!open) setViewingSubmission(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ข้อความติดต่อ</DialogTitle>
            <DialogDescription>
              ส่งเมื่อ{" "}
              {viewingSubmission &&
                new Date(viewingSubmission.createdAt).toLocaleDateString(
                  "th-TH",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
            </DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    ชื่อ
                  </p>
                  <p className="text-sm">{viewingSubmission.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    อีเมล
                  </p>
                  <p className="text-sm">{viewingSubmission.email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  เรื่อง
                </p>
                <p className="text-sm">{viewingSubmission.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  ข้อความ
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {viewingSubmission.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={viewingSubmission.isRead ? "outline" : "default"}
                >
                  {viewingSubmission.isRead ? "อ่านแล้ว" : "ยังไม่ได้อ่าน"}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingSubmission(null)}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลบข้อความ</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบข้อความนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          {deletingSubmission && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm font-medium">
                จาก: {deletingSubmission.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {deletingSubmission.subject}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
