"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ScrollText, ChevronDown, ChevronRight } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLog } from "@prisma/client";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Action label mapping
// -----------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  USER_CREATE: "สร้างผู้ใช้",
  USER_UPDATE: "แก้ไขผู้ใช้",
  USER_DEACTIVATE: "ปิดใช้งานผู้ใช้",
  VIDEO_CREATE: "สร้างวิดีโอ",
  VIDEO_UPDATE: "แก้ไขวิดีโอ",
  VIDEO_DELETE: "ลบวิดีโอ",
  PERMISSION_GRANT: "ให้สิทธิ์",
  PERMISSION_REVOKE: "ถอนสิทธิ์",
  PERMISSION_BULK_GRANT: "ให้สิทธิ์แบบกลุ่ม",
  PERMISSION_BULK_REVOKE: "ถอนสิทธิ์แบบกลุ่ม",
  PERMISSION_UPDATE: "แก้ไขสิทธิ์",
  BLOG_CREATE: "สร้างบล็อก",
  BLOG_UPDATE: "แก้ไขบล็อก",
  BLOG_DELETE: "ลบบล็อก",
  BLOG_TOGGLE_STATUS: "เปลี่ยนสถานะบล็อก",
  BLOG_CATEGORY_CREATE: "สร้างหมวดหมู่บล็อก",
  BLOG_CATEGORY_UPDATE: "แก้ไขหมวดหมู่บล็อก",
  BLOG_CATEGORY_DELETE: "ลบหมวดหมู่บล็อก",
  FAQ_CREATE: "สร้างคำถาม",
  FAQ_UPDATE: "แก้ไขคำถาม",
  FAQ_DELETE: "ลบคำถาม",
  INVITE_CREATE: "สร้างลิงก์เชิญ",
  INVITE_REVOKE: "ยกเลิกลิงก์เชิญ",
  THEME_UPDATE: "แก้ไขธีม",
  THEME_LOGO_UPLOAD: "อัปโหลดโลโก้",
  THEME_LOGO_REMOVE: "ลบโลโก้",
  CONTENT_UPDATE: "แก้ไขเนื้อหา",
  OAUTH_UPDATE: "แก้ไข OAuth",
  PLAYLIST_CREATE: "สร้างเพลย์ลิสต์",
  PLAYLIST_UPDATE: "แก้ไขเพลย์ลิสต์",
  PLAYLIST_DELETE: "ลบเพลย์ลิสต์",
  PLAYLIST_ADD_VIDEO: "เพิ่มวิดีโอในเพลย์ลิสต์",
  PLAYLIST_REMOVE_VIDEO: "ลบวิดีโอจากเพลย์ลิสต์",
  MATERIAL_CREATE: "เพิ่มเอกสาร",
  MATERIAL_DELETE: "ลบเอกสาร",
  CONTACT_READ: "อ่านข้อความ",
  CONTACT_DELETE: "ลบข้อความ",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "ผู้ใช้",
  Video: "วิดีโอ",
  VideoPermission: "สิทธิ์",
  BlogPost: "บล็อก",
  BlogCategory: "หมวดหมู่บล็อก",
  Faq: "คำถาม",
  InviteLink: "ลิงก์เชิญ",
  Theme: "ธีม",
  SiteContent: "เนื้อหา",
  OAuthProvider: "OAuth",
  Playlist: "เพลย์ลิสต์",
  CourseMaterial: "เอกสาร",
  ContactSubmission: "ข้อความติดต่อ",
};

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface AuditLogsTableProps {
  logs: AuditLog[];
  meta: PaginationMeta;
  actionTypes: string[];
  entityTypes: string[];
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function AuditLogsTable({
  logs,
  meta,
  actionTypes,
  entityTypes,
}: AuditLogsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get("page") ?? "1");
  const currentAction = searchParams.get("action") ?? "";
  const currentEntity = searchParams.get("entityType") ?? "";
  const currentSearch = searchParams.get("search") ?? "";
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set(),
  );

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ search: searchInput || undefined, page: "1" });
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={currentAction || "all"}
            onValueChange={(v) =>
              pushParams({ action: v === "all" ? undefined : v, page: "1" })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="การดำเนินการทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">การดำเนินการทั้งหมด</SelectItem>
              {actionTypes.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentEntity || "all"}
            onValueChange={(v) =>
              pushParams({
                entityType: v === "all" ? undefined : v,
                page: "1",
              })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="ประเภททั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ประเภททั้งหมด</SelectItem>
              {entityTypes.map((e) => (
                <SelectItem key={e} value={e}>
                  {ENTITY_LABELS[e] ?? e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <Input
              placeholder="ค้นหาอีเมล / Entity ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-52"
            />
            <Button type="submit" variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Input
            type="date"
            value={currentFrom}
            onChange={(e) =>
              pushParams({ from: e.target.value || undefined, page: "1" })
            }
            className="w-36"
            aria-label="ตั้งแต่วันที่"
          />
          <Input
            type="date"
            value={currentTo}
            onChange={(e) =>
              pushParams({ to: e.target.value || undefined, page: "1" })
            }
            className="w-36"
            aria-label="ถึงวันที่"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          {meta.total} รายการ
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-40">วันเวลา</TableHead>
              <TableHead>ผู้ดำเนินการ</TableHead>
              <TableHead>การดำเนินการ</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>Entity ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ScrollText className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ไม่พบบันทึก</p>
                    <p className="text-xs">ยังไม่มีการดำเนินการที่บันทึกไว้</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const hasMetadata =
                  log.metadata &&
                  typeof log.metadata === "object" &&
                  Object.keys(log.metadata as object).length > 0;
                const isExpanded = expandedRows.has(log.id);

                return (
                  <React.Fragment key={log.id}>
                    <TableRow className="group">
                      <TableCell>
                        {hasMetadata && (
                          <button
                            onClick={() => toggleRow(log.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={
                              isExpanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.userEmail}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.entityId
                          ? `${log.entityId.slice(0, 12)}...`
                          : "-"}
                      </TableCell>
                    </TableRow>
                    {isExpanded && hasMetadata && (
                      <TableRow>
                        <TableCell />
                        <TableCell colSpan={5}>
                          <pre className="max-h-40 overflow-auto rounded bg-muted p-3 text-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
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
