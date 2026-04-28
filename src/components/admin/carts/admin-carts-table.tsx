"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceTHB } from "@/lib/order-utils";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types";
import type { AdminCartRow } from "@/actions/cart.actions";

interface AdminCartsTableProps {
  carts: AdminCartRow[];
  meta: PaginationMeta;
  initialSearch?: string;
}

function staleDays(updatedAt: Date): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

export function AdminCartsTable({ carts, meta, initialSearch }: AdminCartsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [searchValue, setSearchValue] = React.useState(initialSearch ?? "");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  React.useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    return `${pathname}?${params.toString()}`;
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value || undefined, page: "1" }));
    }, 300);
  }

  function toggleExpand(cartId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cartId)) next.delete(cartId);
      else next.add(cartId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="carts-search"
          aria-label="ค้นหาตะกร้าสินค้า"
          placeholder="ค้นหาชื่อหรืออีเมลนักเรียน..."
          className="pl-8"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {carts.length === 0 ? (
        <div data-testid="carts-empty-state" className="py-12 text-center text-muted-foreground">
          ไม่พบตะกร้าสินค้า
        </div>
      ) : (
        <>
          <div className="rounded-md border" data-testid="carts-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>นักเรียน</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>มูลค่ารวม</TableHead>
                  <TableHead>อัปเดตล่าสุด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map((cart) => {
                  const isExpanded = expandedIds.has(cart.id);
                  const days = staleDays(cart.updatedAt);

                  return (
                    <React.Fragment key={cart.id}>
                      <TableRow
                        data-testid={`cart-row-${cart.userId}`}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        className={cn("cursor-pointer", isExpanded && "border-b-0")}
                        onClick={() => toggleExpand(cart.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpand(cart.id);
                          }
                        }}
                      >
                        <TableCell className="w-8" data-testid={`cart-row-expand-${cart.userId}`}>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-150",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="truncate text-sm font-medium">{cart.user.name ?? "—"}</p>
                            <p className="truncate text-xs text-muted-foreground">{cart.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="tabular-nums">
                            {cart.itemCount} รายการ
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{formatPriceTHB(cart.totalSatang)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {days > 30 && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-red-400"
                                aria-label="ไม่มีการเคลื่อนไหวนานมาก"
                              />
                            )}
                            {days > 7 && days <= 30 && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                                aria-label="ตะกร้าอาจถูกละทิ้ง"
                              />
                            )}
                            {new Date(cart.updatedAt).toLocaleDateString("th-TH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="p-0">
                            <div className="border-t bg-muted/30 px-4 py-3" data-testid="cart-items-list">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-muted-foreground">
                                    <th className="pb-1.5 text-left font-medium">ชื่อคอร์ส</th>
                                    <th className="pb-1.5 text-right font-medium">ราคา</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cart.items.map((item) => {
                                    const effectivePrice =
                                      item.product.salePriceSatang ?? item.product.priceSatang;
                                    return (
                                      <tr
                                        key={item.id}
                                        className={cn(
                                          "border-t border-border/50",
                                          !item.product.isActive && "opacity-60"
                                        )}
                                      >
                                        <td className="py-1.5 pr-4">
                                          <span
                                            className={cn(
                                              !item.product.isActive &&
                                                "text-muted-foreground line-through"
                                            )}
                                          >
                                            {item.product.playlist.title}
                                          </span>
                                          {!item.product.isActive && (
                                            <Badge
                                              variant="outline"
                                              className="ml-2 px-1 py-0 text-[10px]"
                                            >
                                              ปิดใช้งาน
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                                          {formatPriceTHB(effectivePrice)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                หน้า {meta.page} จาก {meta.totalPages} ({meta.total} รายการ)
              </p>
              <div className="flex gap-2">
                <Button
                  data-testid="pagination-prev"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => router.push(buildUrl({ page: String(currentPage - 1) }))}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  data-testid="pagination-next"
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
