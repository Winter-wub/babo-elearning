import type { Metadata } from "next";
import { getSiteContent } from "@/actions/content.actions";
import { CHECKOUT_KEYS } from "@/lib/constants";
import { PaymentMethodsForm } from "@/components/admin/payment-methods-form";

export const metadata: Metadata = {
  title: "ช่องทางชำระเงิน",
};

export default async function AdminPaymentMethodsPage() {
  const keys = Object.values(CHECKOUT_KEYS);
  const result = await getSiteContent(keys);
  const data = result.success ? result.data : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ช่องทางชำระเงิน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ตั้งค่าข้อมูลบัญชีธนาคารและพร้อมเพย์สำหรับหน้าชำระเงิน
        </p>
      </div>
      <PaymentMethodsForm initialData={data} />
    </div>
  );
}
