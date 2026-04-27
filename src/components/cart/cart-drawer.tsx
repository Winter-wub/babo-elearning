"use client";

import * as React from "react";
import Link from "next/link";
import { Trash2, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getCart, removeFromCart } from "@/actions/cart.actions";
import { formatPriceTHB } from "@/lib/order-utils";
import type { CartWithItems } from "@/actions/cart.actions";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { toast } = useToast();
  const [cart, setCart] = React.useState<CartWithItems | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  // Fetch cart when drawer opens
  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCart().then((result) => {
      if (result.success) setCart(result.data);
      setLoading(false);
    });
  }, [open]);

  const subtotal = cart?.items.reduce((sum, item) => {
    const price = item.product.salePriceSatang ?? item.product.priceSatang;
    return sum + price;
  }, 0) ?? 0;

  async function handleRemove(productId: string) {
    setRemovingId(productId);
    const result = await removeFromCart(productId);
    if (result.success) {
      setCart((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.productId !== productId) } : prev
      );
      toast({ title: "ลบสินค้าแล้ว" });
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setRemovingId(null);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>ตะกร้าสินค้า {cart && cart.items.length > 0 && `(${cart.items.length})`}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
            <Button variant="outline" size="sm" asChild onClick={() => onOpenChange(false)}>
              <Link href="/courses">ดูคอร์สเรียน</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.product.playlist.thumbnailUrl ? (
                        <img
                          src={item.product.playlist.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {item.product.playlist.title}
                      </p>
                      <p className="mt-1 text-sm text-primary font-semibold">
                        {formatPriceTHB(item.product.salePriceSatang ?? item.product.priceSatang)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(item.productId)}
                      disabled={removingId === item.productId}
                      aria-label="ลบออก"
                    >
                      {removingId === item.productId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">รวมทั้งหมด</span>
                <span className="text-lg font-bold">{formatPriceTHB(subtotal)}</span>
              </div>
              <Button className="w-full" size="lg" asChild onClick={() => onOpenChange(false)}>
                <Link href="/checkout">ดำเนินการชำระเงิน</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild onClick={() => onOpenChange(false)}>
                <Link href="/cart">ดูตะกร้า</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
