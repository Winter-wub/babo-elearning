"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  MoreHorizontal,
  Search,
  Building2,
  Users,
  Video,
  ExternalLink,
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
import type { PaginationMeta } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TenantRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  _count: {
    members: number;
    videos: number;
  };
}

interface TenantsTableProps {
  tenants: TenantRow[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TenantsTable({ tenants, meta }: TenantsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("isActive") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- URL helpers ----
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

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: value || undefined, page: "1" });
    }, 400);
  }

  // ---- Format helpers ----
  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อหรือ slug..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <Select
            value={currentStatus || "all"}
            onValueChange={(v) =>
              pushParams({ isActive: v === "all" ? undefined : v, page: "1" })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="ทุกสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="true">ใช้งาน</SelectItem>
              <SelectItem value="false">ระงับ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ / Slug</TableHead>
              <TableHead>สถานะ</TableHead>
              {/* Hidden on small screens to keep the table scannable */}
              <TableHead className="hidden sm:table-cell text-right">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  สมาชิก
                </span>
              </TableHead>
              <TableHead className="hidden sm:table-cell text-right">
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  วิดีโอ
                </span>
              </TableHead>
              <TableHead className="hidden md:table-cell">สร้างเมื่อ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  {/* Empty state */}
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Building2 className="h-10 w-10 opacity-30" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">ไม่พบ Tenant</p>
                      <p className="text-xs">
                        {currentSearch || currentStatus
                          ? "ลองปรับตัวกรองหรือคำค้นหา"
                          : "สร้าง tenant แรกโดยคลิก 'เพิ่ม Tenant'"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {tenant.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.isActive ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      >
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge variant="destructive">ระงับ</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums">
                    {tenant._count.members.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums">
                    {tenant._count.videos.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(tenant.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`การดำเนินการสำหรับ ${tenant.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>การดำเนินการ</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            ดูรายละเอียด
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/tenants/${tenant.id}?tab=settings`}>
                            แก้ไขการตั้งค่า
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/tenants/${tenant.id}?tab=members`}>
                            <Users className="mr-2 h-4 w-4" />
                            จัดการสมาชิก
                          </Link>
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
            จาก <span className="font-medium">{meta.total}</span> tenants
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => pushParams({ page: String(currentPage - 1) })}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= meta.totalPages}
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
