import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyOrders } from "@/actions/order.actions";
import { formatPriceTHB, formatOrderStatus, getOrderStatusVariant } from "@/lib/order-utils";

export const metadata: Metadata = {
  title: "คำสั่งซื้อ",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const result = await getMyOrders(page);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
      </div>
    );
  }

  const { items: orders, meta } = result.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">คำสั่งซื้อ</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <Receipt className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อ</p>
          <Button asChild>
            <Link href="/courses">ดูคอร์สเรียน</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{formatPriceTHB(order.totalSatang)}</span>
                <Badge variant={getOrderStatusVariant(order.status)}>{formatOrderStatus(order.status)}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
