"use client";

import * as React from "react";
import { Loader2, Building2, CreditCard, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { bulkUpdateSiteContent } from "@/actions/content.actions";
import { CHECKOUT_KEYS } from "@/lib/constants";
import { PromptPayQR } from "@/components/shared/promptpay-qr";

interface PaymentMethodsFormProps {
  initialData: Record<string, string>;
}

export function PaymentMethodsForm({ initialData }: PaymentMethodsFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [bankTransferEnabled, setBankTransferEnabled] = React.useState(
    initialData[CHECKOUT_KEYS.bankTransferEnabled] !== "false"
  );
  const [bankName, setBankName] = React.useState(
    initialData[CHECKOUT_KEYS.bankName] ?? ""
  );
  const [accountNumber, setAccountNumber] = React.useState(
    initialData[CHECKOUT_KEYS.accountNumber] ?? ""
  );
  const [accountName, setAccountName] = React.useState(
    initialData[CHECKOUT_KEYS.accountName] ?? ""
  );

  const [promptpayEnabled, setPromptpayEnabled] = React.useState(
    initialData[CHECKOUT_KEYS.promptpayEnabled] === "true"
  );
  const [promptpayId, setPromptpayId] = React.useState(
    initialData[CHECKOUT_KEYS.promptpayId] ?? ""
  );

  async function handleSave() {
    setSaving(true);
    const entries = [
      { key: CHECKOUT_KEYS.bankTransferEnabled, value: String(bankTransferEnabled) },
      { key: CHECKOUT_KEYS.bankName, value: bankName },
      { key: CHECKOUT_KEYS.accountNumber, value: accountNumber },
      { key: CHECKOUT_KEYS.accountName, value: accountName },
      { key: CHECKOUT_KEYS.promptpayEnabled, value: String(promptpayEnabled) },
      { key: CHECKOUT_KEYS.promptpayId, value: promptpayId },
    ];

    const result = await bulkUpdateSiteContent(entries);
    if (result.success) {
      toast({ title: "บันทึกสำเร็จ", description: "อัปเดตช่องทางชำระเงินแล้ว" });
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setSaving(false);
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      {/* Left: Form */}
      <div className="space-y-6">
        {/* Bank Transfer */}
        <Card data-tour="bank-transfer-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                โอนเงินผ่านธนาคาร
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="bank-toggle" className="text-sm text-muted-foreground">
                  {bankTransferEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </Label>
                <Switch
                  id="bank-toggle"
                  checked={bankTransferEnabled}
                  onCheckedChange={setBankTransferEnabled}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">ชื่อธนาคาร</Label>
              <Input
                id="bank-name"
                placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                disabled={!bankTransferEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-number">เลขที่บัญชี</Label>
              <Input
                id="account-number"
                placeholder="เช่น 123-4-56789-0"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={!bankTransferEnabled}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-name">ชื่อเจ้าของบัญชี</Label>
              <Input
                id="account-name"
                placeholder="ชื่อตามสมุดบัญชี"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={!bankTransferEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* PromptPay */}
        <Card data-tour="promptpay-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                พร้อมเพย์
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="promptpay-toggle" className="text-sm text-muted-foreground">
                  {promptpayEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </Label>
                <Switch
                  id="promptpay-toggle"
                  checked={promptpayEnabled}
                  onCheckedChange={setPromptpayEnabled}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="promptpay-id">หมายเลขพร้อมเพย์</Label>
              <Input
                id="promptpay-id"
                placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                disabled={!promptpayEnabled}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          บันทึกการตั้งค่า
        </Button>
      </div>

      {/* Right: Live Preview */}
      <div>
        <Card className="sticky top-24" data-tour="payment-preview">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ตัวอย่างที่ลูกค้าจะเห็น</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
              {bankTransferEnabled && (
                <div className="space-y-2">
                  <p className="font-medium">โอนเงินเข้าบัญชี</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ธนาคาร</span>
                      <span className="font-medium">{bankName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">เลขบัญชี</span>
                      <span className="font-mono">{accountNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ชื่อบัญชี</span>
                      <span>{accountName || "—"}</span>
                    </div>
                  </div>
                </div>
              )}

              {promptpayEnabled && (
                <div className="space-y-2">
                  <p className="font-medium">พร้อมเพย์</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">หมายเลข</span>
                    <span className="font-mono">{promptpayId || "—"}</span>
                  </div>
                  {promptpayId && (
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <PromptPayQR promptpayId={promptpayId} size={120} />
                      <p className="text-center text-[10px] text-muted-foreground">
                        ตัวอย่าง QR (ไม่มีจำนวนเงิน)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!bankTransferEnabled && !promptpayEnabled && (
                <p className="py-4 text-center text-muted-foreground">
                  ไม่มีช่องทางชำระเงินที่เปิดใช้งาน
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
