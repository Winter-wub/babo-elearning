"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { approveOrder, rejectOrder } from "@/actions/order.actions";
import { formatPriceTHB, formatOrderStatus, getOrderStatusVariant } from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";
import type { OrderWithItems } from "@/actions/order.actions";

interface AdminOrderVerificationProps {
  order: OrderWithItems;
}

export function AdminOrderVerification({ order }: AdminOrderVerificationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [approving, setApproving] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [adminNote, setAdminNote] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const canVerify = order.status === OrderStatus.PENDING_VERIFICATION;

  async function handleApprove() {
    setApproving(true);
    const result = await approveOrder(order.id, adminNote || undefined);
    if (result.success) {
      toast({ title: "อนุมัติคำสั่งซื้อแล้ว" });
      setApproveOpen(false);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setApproving(false);
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast({ variant: "destructive", title: "กรุณาระบุเหตุผล" });
      return;
    }
    setRejecting(true);
    const result = await rejectOrder(order.id, rejectReason);
    if (result.success) {
      toast({ title: "ปฏิเสธคำสั่งซื้อแล้ว" });
      setRejectOpen(false);
      router.refresh();
    } else {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
    }
    setRejecting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">คำสั่งซื้อ {order.orderNumber}</h1>
          <Badge variant={getOrderStatusVariant(order.status)} className="mt-1">
            {formatOrderStatus(order.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Order info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ข้อมูลคำสั่งซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">นักเรียน</span>
              <span className="font-medium">{order.user.name ?? "—"} ({order.user.email})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">วันที่สั่งซื้อ</span>
              <span>{new Date(order.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="line-clamp-1 flex-1">{item.snapshotTitle}</span>
                  <span className="ml-4 shrink-0">{formatPriceTHB(item.snapshotPriceSatang)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex justify-between font-medium">
              <span>ยอดรวม</span>
              <span className="text-lg text-primary">{formatPriceTHB(order.totalSatang)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Slip image */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">สลิปการโอนเงิน</CardTitle>
          </CardHeader>
          <CardContent>
            {order.paymentSlip ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/slips/${order.id}/image`}
                  alt="สลิปการโอนเงิน"
                  className="w-full rounded-lg border"
                />
                <p className="text-xs text-muted-foreground">
                  อัปโหลดเมื่อ {new Date(order.paymentSlip.uploadedAt).toLocaleDateString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่ได้อัปโหลดสลิป</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      {canVerify && (
        <div className="flex gap-3">
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1" size="lg">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                อนุมัติ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ยืนยันการอนุมัติ</DialogTitle>
                <DialogDescription>
                  ระบบจะเปิดสิทธิ์เข้าถึงคอร์สเรียนให้นักเรียนอัตโนมัติ
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>หมายเหตุ (ไม่บังคับ)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="หมายเหตุสำหรับบันทึก..."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveOpen(false)}>ยกเลิก</Button>
                <Button onClick={handleApprove} disabled={approving}>
                  {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ยืนยันอนุมัติ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex-1" size="lg">
                <XCircle className="mr-2 h-4 w-4" />
                ปฏิเสธ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ปฏิเสธคำสั่งซื้อ</DialogTitle>
                <DialogDescription>
                  กรุณาระบุเหตุผลเพื่อแจ้งให้นักเรียนทราบ
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>เหตุผล *</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="เช่น จำนวนเงินไม่ตรง, สลิปไม่ชัดเจน..."
                  required
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>ยกเลิก</Button>
                <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
                  {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ยืนยันปฏิเสธ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
