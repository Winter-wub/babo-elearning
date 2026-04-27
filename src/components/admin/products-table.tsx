"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Search,
  Package,
  Loader2,
  Plus,
  Pencil,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  updateProduct,
  createProduct,
  getAvailablePlaylists,
} from "@/actions/product.actions";
import { formatPriceTHB } from "@/lib/order-utils";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Product, Playlist } from "@prisma/client";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type ProductWithPlaylist = Product & {
  playlist: Pick<Playlist, "id" | "title" | "slug" | "thumbnailUrl" | "thumbnailKey" | "isActive"> & {
    _count: { videos: number };
  };
};

export interface ProductsTableProps {
  products: ProductWithPlaylist[];
  meta: PaginationMeta;
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function ProductsTable({ products, meta }: ProductsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ---- URL-driven state ----
  const currentSearch = searchParams.get("search") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  // ---- Local transient state ----
  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const [isPending, startTransition] = React.useTransition();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [availablePlaylists, setAvailablePlaylists] = React.useState<
    Pick<Playlist, "id" | "title">[]
  >([]);
  const [loadingPlaylists, setLoadingPlaylists] = React.useState(false);

  // Form state
  const [formPlaylistId, setFormPlaylistId] = React.useState("");
  const [formPrice, setFormPrice] = React.useState("");
  const [formSalePrice, setFormSalePrice] = React.useState("");
  const [formAccessDays, setFormAccessDays] = React.useState("365");
  const [formSubmitting, setFormSubmitting] = React.useState(false);

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

  // Debounced search
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: value || undefined, page: "1" });
    }, 400);
  }

  // ---- Toggle active ----
  function handleToggleActive(product: ProductWithPlaylist) {
    startTransition(async () => {
      const result = await updateProduct(product.id, {
        isActive: !product.isActive,
      });
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "ข้อผิดพลาด",
          description: result.error,
        });
        return;
      }
      router.refresh();
      toast({
        title: product.isActive ? "ปิดใช้งานสินค้าแล้ว" : "เปิดใช้งานสินค้าแล้ว",
        description: `"${product.playlist.title}" ตอนนี้${product.isActive ? "ไม่ใช้งาน" : "ใช้งาน"}แล้ว`,
      });
    });
  }

  // ---- Dialog helpers ----
  async function openCreateDialog() {
    setLoadingPlaylists(true);
    const result = await getAvailablePlaylists();
    setLoadingPlaylists(false);
    if (result.success) {
      setAvailablePlaylists(result.data);
    }
    setFormPlaylistId("");
    setFormPrice("");
    setFormSalePrice("");
    setFormAccessDays("365");
    setDialogOpen(true);
  }

  function resetForm() {
    setFormPlaylistId("");
    setFormPrice("");
    setFormSalePrice("");
    setFormAccessDays("365");
    setFormSubmitting(false);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);

    const priceSatang = Math.round(Number(formPrice) * 100);
    const salePriceSatang = formSalePrice
      ? Math.round(Number(formSalePrice) * 100)
      : null;
    const accessDurationDays = Number(formAccessDays) || 365;

    const result = await createProduct({
      playlistId: formPlaylistId,
      priceSatang,
      salePriceSatang,
      accessDurationDays,
    });

    setFormSubmitting(false);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "ข้อผิดพลาด",
        description: result.error,
      });
      return;
    }

    toast({
      title: "สร้างสินค้าสำเร็จ",
      description: "เพิ่มสินค้ารายการใหม่เรียบร้อยแล้ว",
    });
    resetForm();
    setDialogOpen(false);
    router.refresh();
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาตามชื่อคอร์ส..."
              className="pl-8"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Create button */}
        <Button
          onClick={openCreateDialog}
          className="shrink-0"
          disabled={isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          สร้างสินค้า
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เพลย์ลิสต์</TableHead>
              <TableHead className="w-28">ราคา</TableHead>
              <TableHead className="w-28">ราคาลด</TableHead>
              <TableHead className="w-28">ระยะเวลา</TableHead>
              <TableHead className="w-24">สถานะ</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ไม่พบสินค้า</p>
                    <p className="text-xs">
                      {currentSearch
                        ? "ลองปรับการค้นหา"
                        : "สร้างสินค้าแรกเพื่อเริ่มต้น"}
                    </p>
                    {!currentSearch && (
                      <Button
                        onClick={openCreateDialog}
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        สร้างสินค้า
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className={
                    isPending
                      ? "opacity-60"
                      : !product.isActive
                        ? "bg-muted/50 opacity-60 grayscale-[0.5]"
                        : undefined
                  }
                >
                  {/* Playlist title */}
                  <TableCell>
                    <Link
                      href={`/admin/playlists/${product.playlist.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.playlist.title}
                    </Link>
                    {product.playlist._count.videos > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {product.playlist._count.videos} วิดีโอ
                      </p>
                    )}
                  </TableCell>

                  {/* Price */}
                  <TableCell className="tabular-nums">
                    {formatPriceTHB(product.priceSatang)}
                  </TableCell>

                  {/* Sale Price */}
                  <TableCell className="tabular-nums">
                    {product.salePriceSatang != null ? (
                      <PriceDisplay
                        priceSatang={product.priceSatang}
                        salePriceSatang={product.salePriceSatang}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Access Duration */}
                  <TableCell className="tabular-nums text-muted-foreground">
                    {product.accessDurationDays} วัน
                  </TableCell>

                  {/* Status toggle */}
                  <TableCell>
                    <Switch
                      checked={product.isActive}
                      onCheckedChange={() => handleToggleActive(product)}
                      disabled={isPending}
                      aria-label={`Toggle active for ${product.playlist.title}`}
                    />
                  </TableCell>

                  {/* Row actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${product.playlist.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          การดำเนินการ
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/playlists/${product.playlist.id}`}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            แก้ไข
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={
                            product.isActive
                              ? "text-amber-600 focus:text-amber-600"
                              : "text-green-600 focus:text-green-600"
                          }
                          onClick={() => handleToggleActive(product)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          {product.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
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
            จาก <span className="font-medium">{meta.total}</span> สินค้า
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

      {/* Create Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>สร้างสินค้าใหม่</DialogTitle>
            <DialogDescription>
              เลือกเพลย์ลิสต์และกำหนดราคาเพื่อเปิดขายคอร์ส
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="playlist">เพลย์ลิสต์</Label>
              <Select
                value={formPlaylistId}
                onValueChange={setFormPlaylistId}
                disabled={loadingPlaylists || formSubmitting}
              >
                <SelectTrigger id="playlist">
                  <SelectValue placeholder="เลือกเพลย์ลิสต์" />
                </SelectTrigger>
                <SelectContent>
                  {loadingPlaylists ? (
                    <SelectItem value="loading" disabled>
                      กำลังโหลด...
                    </SelectItem>
                  ) : (
                    availablePlaylists.map((pl) => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">ราคา (บาท)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                required
                disabled={formSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice">ราคาลด (บาท) — ไม่บังคับ</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="เว้นว่างหากไม่มี"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                disabled={formSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessDays">ระยะเวลาเข้าถึง (วัน)</Label>
              <Input
                id="accessDays"
                type="number"
                min="1"
                value={formAccessDays}
                onChange={(e) => setFormAccessDays(e.target.value)}
                disabled={formSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={formSubmitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={formSubmitting}>
                {formSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                สร้างสินค้า
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
