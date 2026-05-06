"use client";

import generatePayload from "promptpay-qr";
import { QRCodeSVG } from "qrcode.react";

interface PromptPayQRProps {
  promptpayId: string;
  amount?: number;
  size?: number;
}

export function PromptPayQR({ promptpayId, amount, size = 200 }: PromptPayQRProps) {
  const sanitizedId = promptpayId.replace(/\D/g, "");

  try {
    const payload = generatePayload(sanitizedId, amount ? { amount } : {});
    return (
      <div className="flex flex-col items-center gap-2">
        <QRCodeSVG value={payload} size={size} level="M" />
      </div>
    );
  } catch {
    return (
      <p className="text-xs text-destructive">
        ไม่สามารถสร้าง QR Code ได้ กรุณาตรวจสอบหมายเลขพร้อมเพย์
      </p>
    );
  }
}
