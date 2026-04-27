import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMyOrderDetail } from "@/actions/order.actions";
import { OrderDetailContent } from "@/components/orders/order-detail-content";

export const metadata: Metadata = {
  title: "รายละเอียดคำสั่งซื้อ",
};

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const result = await getMyOrderDetail(orderId);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <OrderDetailContent order={result.data} />
    </div>
  );
}
