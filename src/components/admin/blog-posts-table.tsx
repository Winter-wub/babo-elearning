"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminBlogPosts,
  deleteBlogPost,
  toggleBlogPostStatus,
} from "@/actions/blog.actions";
import type { PaginatedResult, AdminBlogPostRow, BlogCategoryWithCount } from "@/types";

interface BlogPostsTableProps {
  initialData: PaginatedResult<AdminBlogPostRow>;
  categories: BlogCategoryWithCount[];
}

export function BlogPostsTable({ initialData, categories }: BlogPostsTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchData = React.useCallback(async (p: number, s: string, status: string) => {
    setLoading(true);
    const result = await getAdminBlogPosts(
      p,
      s || undefined,
      status === "all" ? undefined : (status as "DRAFT" | "PUBLISHED")
    );
    if (result.success) {
      setData(result.data);
    }
    setLoading(false);
  }, []);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData(1, search, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchData]);

  async function handleToggleStatus(id: string) {
    const result = await toggleBlogPostStatus(id);
    if (result.success) {
      toast({ title: result.data.status === "PUBLISHED" ? "เผยแพร่บทความแล้ว" : "เปลี่ยนเป็นฉบับร่างแล้ว" });
      fetchData(page, search, statusFilter);
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteBlogPost(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (result.success) {
      toast({ title: "ลบบทความแล้ว" });
      fetchData(page, search, statusFilter);
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchData(newPage, search, statusFilter);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาบทความ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="ทุกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกสถานะ</SelectItem>
            <SelectItem value="PUBLISHED">เผยแพร่แล้ว</SelectItem>
            <SelectItem value="DRAFT">ฉบับร่าง</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="mr-1.5 h-4 w-4" />
            สร้างบทความ
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อบทความ</TableHead>
              <TableHead className="hidden sm:table-cell">หมวดหมู่</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="hidden md:table-cell">วันที่</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ยังไม่มีบทความ</p>
                    <p className="text-xs">สร้างบทความแรกเพื่อแชร์ความรู้กับผู้เรียน</p>
                    <Button asChild size="sm" className="mt-2">
                      <Link href="/admin/blog/new">
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        สร้างบทความ
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((post) => (
                <TableRow key={post.id} className={loading ? "opacity-50" : ""}>
                  <TableCell>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-medium text-foreground hover:underline line-clamp-1"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                      /blog/{post.slug}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.categories.map((cat) => (
                        <Badge key={cat.id} variant="secondary" className="text-xs">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        post.status === "PUBLISHED"
                          ? "border-green-500 text-green-600"
                          : "border-amber-400 text-amber-600"
                      }
                    >
                      {post.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/blog/${post.id}`)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          แก้ไข
                        </DropdownMenuItem>
                        {post.status === "PUBLISHED" && (
                          <DropdownMenuItem asChild>
                            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-3.5 w-3.5" />
                              ดูบทความ
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(post.id)}>
                          {post.status === "PUBLISHED" ? (
                            <><EyeOff className="mr-2 h-3.5 w-3.5" />นำกลับเป็นร่าง</>
                          ) : (
                            <><Eye className="mr-2 h-3.5 w-3.5" />เผยแพร่</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(post.id)}
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
      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            แสดง {(page - 1) * data.meta.pageSize + 1}–
            {Math.min(page * data.meta.pageSize, data.meta.total)} จาก{" "}
            {data.meta.total} บทความ
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              ก่อน��น้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.meta.totalPages}
            >
              ถัดไ��
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบบทความ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            การดำเนินการนี้ไม่สามารถย้อนกลับได้ บทความจะถูกลบอย่างถาวร
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "กำลังลบ..." : "ลบบทความ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
