import { randomBytes } from "crypto";
import { OrderStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.PENDING_VERIFICATION, OrderStatus.EXPIRED, OrderStatus.CANCELLED],
  PENDING_VERIFICATION: [OrderStatus.APPROVED, OrderStatus.REJECTED],
  APPROVED: [],
  REJECTED: [OrderStatus.PENDING_VERIFICATION],
  EXPIRED: [],
  CANCELLED: [],
};

export function validateTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function formatOrderStatus(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING_PAYMENT: "รอชำระเงิน",
    PENDING_VERIFICATION: "รอตรวจสอบ",
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ปฏิเสธ",
    EXPIRED: "หมดอายุ",
    CANCELLED: "ยกเลิก",
  };
  return labels[status];
}

export function getOrderStatusVariant(status: OrderStatus): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING_PAYMENT: "secondary",
    PENDING_VERIFICATION: "outline",
    APPROVED: "default",
    REJECTED: "destructive",
    EXPIRED: "secondary",
    CANCELLED: "secondary",
  };
  return variants[status];
}

export function formatPriceTHB(satang: number): string {
  return `฿${(satang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${date}-${rand}`;
}
