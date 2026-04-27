import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AdminOrdersTable } from "@/components/admin/orders/admin-orders-table";
import { getAdminOrders } from "@/actions/order.actions";

export const metadata: Metadata = {
  title: "จัดการคำสั่งซื้อ",
};

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

async function OrdersContent({ searchParams }: Props) {
  const params = await searchParams;
  const result = await getAdminOrders({
    page: params.page ? Number(params.page) : 1,
    status: (params.status as any) || undefined,
  });

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <AdminOrdersTable orders={result.data.items} meta={result.data.meta} />;
}

export default function AdminOrdersPage(props: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">จัดการคำสั่งซื้อ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ตรวจสอบและอนุมัติคำสั่งซื้อ
        </p>
      </div>
      <Suspense fallback={<Spinner size="lg" />}>
        <OrdersContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
