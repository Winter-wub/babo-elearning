"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, CheckCheck, Clock, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { createOrder } from "@/actions/order.actions";
import { formatPriceTHB } from "@/lib/order-utils";
import { trackBeginCheckout } from "@/lib/gtm";
import type { CartWithItems } from "@/actions/cart.actions";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  promptpayId: string;
  bankTransferEnabled: boolean;
  promptpayEnabled: boolean;
}

interface CheckoutContentProps {
  cart: CartWithItems;
  bankDetails: BankDetails;
}

export function CheckoutContent({ cart, bankDetails }: CheckoutContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (cart.items.length > 0) {
      const products = cart.items.map((item) => ({
        id: item.product.id,
        priceSatang: item.product.priceSatang,
        salePriceSatang: item.product.salePriceSatang,
        playlist: { title: item.product.playlist.title },
      }));
      const total = cart.items.reduce(
        (sum, item) => sum + (item.product.salePriceSatang ?? item.product.priceSatang),
        0,
      );
      trackBeginCheckout(products, total);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = cart.items.reduce((sum, item) => {
    return sum + (item.product.salePriceSatang ?? item.product.priceSatang);
  }, 0);

  async function handleConfirmOrder() {
    setCreating(true);
    const result = await createOrder();
    if (result.success) {
      router.push(`/orders/${result.data.orderId}`);
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setCreating(false);
  }

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  function CopyButton({ text, field }: { text: string; field: string }) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopy(text, field)}>
        {copiedField === field ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">1. ยืนยันคำสั่งซื้อ</span>
        <span>→</span>
        <span>2. ส่งหลักฐาน</span>
        <span>→</span>
        <span>3. รอยืนยัน</span>
      </div>

      {/* Order summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">สรุปคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="line-clamp-1 flex-1">{item.product.playlist.title}</span>
              <span className="ml-4 shrink-0 font-medium">{formatPriceTHB(item.product.salePriceSatang ?? item.product.priceSatang)}</span>
            </div>
          ))}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">ยอดรวมทั้งหมด</span>
              <span className="text-lg font-bold text-primary">{formatPriceTHB(subtotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank details */}
      {bankDetails.bankTransferEnabled && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              โอนเงินเข้าบัญชี
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">ธนาคาร</p>
                <p className="font-medium">{bankDetails.bankName}</p>
              </div>
              <CopyButton text={bankDetails.bankName} field="bank" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">เลขบัญชี</p>
                <p className="font-mono font-medium">{bankDetails.accountNumber}</p>
              </div>
              <CopyButton text={bankDetails.accountNumber.replace(/-/g, "")} field="account" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">ชื่อบัญชี</p>
                <p className="font-medium">{bankDetails.accountName}</p>
              </div>
              <CopyButton text={bankDetails.accountName} field="name" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
                <p className="text-lg font-bold text-primary">{formatPriceTHB(subtotal)}</p>
              </div>
              <CopyButton text={String(subtotal / 100)} field="amount" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* PromptPay */}
      {bankDetails.promptpayEnabled && bankDetails.promptpayId && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              พร้อมเพย์
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">หมายเลขพร้อมเพย์</p>
                <p className="font-mono font-medium">{bankDetails.promptpayId}</p>
              </div>
              <CopyButton text={bankDetails.promptpayId} field="promptpay" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
                <p className="text-lg font-bold text-primary">{formatPriceTHB(subtotal)}</p>
              </div>
              <CopyButton text={String(subtotal / 100)} field="amount2" />
            </div>
          </CardContent>
        </Card>
      )}

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>กรุณาโอนเงินและส่งหลักฐานภายใน 24 ชั่วโมง มิฉะนั้นคำสั่งซื้อจะถูกยกเลิกอัตโนมัติ</AlertDescription>
      </Alert>

      <Button className="w-full" size="lg" onClick={handleConfirmOrder} disabled={creating}>
        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        ยืนยันคำสั่งซื้อ
      </Button>
    </div>
  );
}
