"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, XCircle, Upload, Loader2, AlertTriangle, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { uploadSlip, cancelOrder } from "@/actions/order.actions";
import { formatPriceTHB, formatOrderStatus, getOrderStatusVariant } from "@/lib/order-utils";
import { OrderStatus } from "@prisma/client";
import type { OrderWithItems } from "@/actions/order.actions";

interface OrderDetailContentProps {
  order: OrderWithItems;
}

export function OrderDetailContent({ order }: OrderDetailContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const previewUrl = React.useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  React.useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const canUploadSlip = order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PENDING_VERIFICATION || order.status === OrderStatus.REJECTED;
  const canCancel = order.status === OrderStatus.PENDING_PAYMENT;
  const hasSlip = !!order.paymentSlip;

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(file);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("slip", selectedFile);
      const result = await uploadSlip(order.id, formData);
      if (result.success) {
        toast({ title: "ส่งหลักฐานแล้ว", description: "ทีมงานจะตรวจสอบภายใน 24 ชั่วโมง" });
        setSelectedFile(null);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "อัปโหลดไม่สำเร็จ", description: result.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "อัปโหลดไม่สำเร็จ", description: err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
    } finally {
      setUploading(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const result = await cancelOrder(order.id);
      if (result.success) {
        toast({ title: "ยกเลิกคำสั่งซื้อแล้ว" });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "ข้อผิดพลาด", description: "เกิดข้อผิดพลาดที่ไม่คาดคิด" });
    } finally {
      setCancelling(false);
    }
  }

  const statusIcon = {
    [OrderStatus.PENDING_PAYMENT]: <Clock className="h-8 w-8 text-amber-500" />,
    [OrderStatus.PENDING_VERIFICATION]: <Clock className="h-8 w-8 text-blue-500" />,
    [OrderStatus.APPROVED]: <CheckCircle2 className="h-8 w-8 text-green-500" />,
    [OrderStatus.REJECTED]: <XCircle className="h-8 w-8 text-red-500" />,
    [OrderStatus.EXPIRED]: <AlertTriangle className="h-8 w-8 text-muted-foreground" />,
    [OrderStatus.CANCELLED]: <XCircle className="h-8 w-8 text-muted-foreground" />,
  };

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">{statusIcon[order.status]}</div>
        <Badge variant={getOrderStatusVariant(order.status)} className="text-sm">
          {formatOrderStatus(order.status)}
        </Badge>
        {order.status === OrderStatus.PENDING_VERIFICATION && (
          <p className="text-sm text-muted-foreground">ทีมงานจะยืนยันภายใน 24 ชั่วโมง</p>
        )}
        {order.status === OrderStatus.APPROVED && (
          <p className="text-sm text-green-600">เข้าเรียนได้แล้ว!</p>
        )}
      </div>

      {/* Rejection alert */}
      {order.status === OrderStatus.REJECTED && order.rejectionReason && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>สลิปถูกปฏิเสธ</AlertTitle>
          <AlertDescription>{order.rejectionReason}</AlertDescription>
        </Alert>
      )}

      {/* Order info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">รายละเอียดคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">หมายเลข</span>
            <span className="font-mono">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">วันที่สั่งซื้อ</span>
            <span>{new Date(order.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="border-t pt-3 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="line-clamp-1 flex-1">{item.snapshotTitle}</span>
                <span className="ml-4 shrink-0">{formatPriceTHB(item.snapshotPriceSatang)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">ยอดรวม</span>
            <span className="text-lg font-bold text-primary">{formatPriceTHB(order.totalSatang)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded slip display */}
      {hasSlip && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              หลักฐานการชำระเงิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/slips/${order.id}/image`}
                alt="สลิปการโอนเงิน"
                className="w-full object-contain max-h-96"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              อัปโหลดเมื่อ {new Date(order.paymentSlip!.uploadedAt).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Slip upload / re-upload section */}
      {canUploadSlip && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {hasSlip ? "เปลี่ยนสลิป" : order.status === OrderStatus.REJECTED ? "อัปโหลดสลิปใหม่" : "อัปโหลดสลิปการโอนเงิน"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl!} alt="Preview" className="h-20 w-20 rounded-md object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>เปลี่ยน</Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">ลากไฟล์มาวาง หรือแตะเพื่ออัปโหลด</span>
                <span className="text-xs">JPG, PNG, WebP สูงสุด 10MB</span>
              </button>
            )}

            <Button className="w-full" size="lg" onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasSlip ? "อัปโหลดสลิปใหม่" : "ส่งหลักฐานการชำระเงิน"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cancel button */}
      {canCancel && (
        <Button variant="outline" className="w-full" onClick={handleCancel} disabled={cancelling}>
          {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          ยกเลิกคำสั่งซื้อ
        </Button>
      )}
    </div>
  );
}
