"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { removeFromCart } from "@/actions/cart.actions";
import { formatPriceTHB } from "@/lib/order-utils";
import { trackViewCart, trackRemoveFromCart } from "@/lib/gtm";
import { PriceDisplay } from "@/components/shared/price-display";
import type { CartWithItems } from "@/actions/cart.actions";

interface CartPageContentProps {
  cart: CartWithItems;
}

export function CartPageContent({ cart: initialCart }: CartPageContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(initialCart.items);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialCart.items.length > 0) {
      const products = initialCart.items.map((item) => ({
        id: item.product.id,
        priceSatang: item.product.priceSatang,
        salePriceSatang: item.product.salePriceSatang,
        playlist: { title: item.product.playlist.title },
      }));
      const total = initialCart.items.reduce(
        (sum, item) => sum + (item.product.salePriceSatang ?? item.product.priceSatang),
        0,
      );
      trackViewCart(products, total);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.salePriceSatang ?? item.product.priceSatang;
    return sum + price;
  }, 0);

  async function handleRemove(productId: string) {
    setRemovingId(productId);
    const result = await removeFromCart(productId);
    if (result.success) {
      const removedItem = items.find((i) => i.productId === productId);
      if (removedItem) {
        trackRemoveFromCart({
          id: removedItem.product.id,
          priceSatang: removedItem.product.priceSatang,
          salePriceSatang: removedItem.product.salePriceSatang,
          playlist: { title: removedItem.product.playlist.title },
        });
      }
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      router.refresh();
      toast({ title: "ลบสินค้าแล้ว" });
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setRemovingId(null);
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        ตะกร้าว่างเปล่า
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Items list */}
      <div className="lg:col-span-2 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 rounded-lg border p-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.product.playlist.thumbnailUrl ? (
                <img src={item.product.playlist.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/playlists/${item.product.playlist.slug}`} className="text-sm font-medium hover:text-primary">
                {item.product.playlist.title}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.product.playlist._count.videos} วิดีโอ</p>
              <div className="mt-1">
                <PriceDisplay priceSatang={item.product.priceSatang} salePriceSatang={item.product.salePriceSatang} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
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

      {/* Order summary sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">สรุปคำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">รวม ({items.length} รายการ)</span>
              <span className="font-medium">{formatPriceTHB(subtotal)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">ยอดรวมทั้งหมด</span>
                <span className="text-lg font-bold text-primary">{formatPriceTHB(subtotal)}</span>
              </div>
            </div>
            <Button className="w-full" size="lg" asChild>
              <Link href="/checkout">ดำเนินการชำระเงิน</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
