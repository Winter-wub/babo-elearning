"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
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
import { formatPriceTHB, formatOrderStatus, getOrderStatusVariant } from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";
import type { PaginationMeta } from "@/types";
import type { OrderWithItems } from "@/actions/order.actions";

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: "ทั้งหมด", value: undefined },
  { label: "รอตรวจสอบ", value: OrderStatus.PENDING_VERIFICATION },
  { label: "รอชำระเงิน", value: OrderStatus.PENDING_PAYMENT },
  { label: "อนุมัติแล้ว", value: OrderStatus.APPROVED },
  { label: "ปฏิเสธ", value: OrderStatus.REJECTED },
];

interface AdminOrdersTableProps {
  orders: OrderWithItems[];
  meta: PaginationMeta;
}

export function AdminOrdersTable({ orders, meta }: AdminOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? undefined;
  const currentPage = Number(searchParams.get("page") ?? "1");

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2" data-tour="orders-filters">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={currentStatus === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => router.push(buildUrl({ status: tab.value, page: "1" }))}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">ไม่พบคำสั่งซื้อ</div>
      ) : (
        <>
          <Table data-tour="orders-table">
            <TableHeader>
              <TableRow>
                <TableHead>หมายเลข</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>ยอดรวม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{order.user.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatPriceTHB(order.totalSatang)}</TableCell>
                  <TableCell>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {formatOrderStatus(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("th-TH", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/orders/${order.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                หน้า {meta.page} จาก {meta.totalPages} ({meta.total} รายการ)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => router.push(buildUrl({ page: String(currentPage - 1) }))}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= meta.totalPages}
                  onClick={() => router.push(buildUrl({ page: String(currentPage + 1) }))}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
