import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@/actions/order.actions";
import { AdminOrderVerification } from "@/components/admin/orders/admin-order-verification";

export const metadata: Metadata = {
  title: "ตรวจสอบคำสั่งซื้อ",
};

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const result = await getAdminOrderDetail(orderId);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminOrderVerification order={result.data} />
    </div>
  );
}
