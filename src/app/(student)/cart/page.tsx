import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCart } from "@/actions/cart.actions";
import { CartPageContent } from "@/components/cart/cart-page-content";

export const metadata: Metadata = {
  title: "ตะกร้าสินค้า",
};

export default async function CartPage() {
  const result = await getCart();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  const cart = result.data;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-semibold">ตะกร้าว่างเปล่า</h1>
          <p className="text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า เลือกคอร์สเรียนที่คุณสนใจ</p>
          <Button asChild>
            <Link href="/courses">ดูคอร์สเรียน</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">ตะกร้าสินค้า ({cart.items.length} รายการ)</h1>
      <CartPageContent cart={cart} />
    </div>
  );
}
