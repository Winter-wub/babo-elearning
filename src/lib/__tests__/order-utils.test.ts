import { describe, it, expect } from "vitest";
import { OrderStatus } from "@prisma/client";
import {
  validateTransition,
  formatOrderStatus,
  getOrderStatusVariant,
  formatPriceTHB,
  generateOrderNumber,
} from "../order-utils";

describe("validateTransition", () => {
  it("allows PENDING_PAYMENT → PENDING_VERIFICATION", () => {
    expect(validateTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.PENDING_VERIFICATION)).toBe(true);
  });

  it("allows PENDING_PAYMENT → EXPIRED", () => {
    expect(validateTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.EXPIRED)).toBe(true);
  });

  it("allows PENDING_PAYMENT → CANCELLED", () => {
    expect(validateTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED)).toBe(true);
  });

  it("allows PENDING_VERIFICATION → APPROVED", () => {
    expect(validateTransition(OrderStatus.PENDING_VERIFICATION, OrderStatus.APPROVED)).toBe(true);
  });

  it("allows PENDING_VERIFICATION → REJECTED", () => {
    expect(validateTransition(OrderStatus.PENDING_VERIFICATION, OrderStatus.REJECTED)).toBe(true);
  });

  it("allows REJECTED → PENDING_VERIFICATION (re-upload)", () => {
    expect(validateTransition(OrderStatus.REJECTED, OrderStatus.PENDING_VERIFICATION)).toBe(true);
  });

  it("rejects APPROVED → any", () => {
    for (const status of Object.values(OrderStatus)) {
      expect(validateTransition(OrderStatus.APPROVED, status)).toBe(false);
    }
  });

  it("rejects EXPIRED → any", () => {
    for (const status of Object.values(OrderStatus)) {
      expect(validateTransition(OrderStatus.EXPIRED, status)).toBe(false);
    }
  });

  it("rejects CANCELLED → any", () => {
    for (const status of Object.values(OrderStatus)) {
      expect(validateTransition(OrderStatus.CANCELLED, status)).toBe(false);
    }
  });

  it("rejects PENDING_PAYMENT → APPROVED (skip verification)", () => {
    expect(validateTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.APPROVED)).toBe(false);
  });

  it("rejects APPROVED → REJECTED (reversal)", () => {
    expect(validateTransition(OrderStatus.APPROVED, OrderStatus.REJECTED)).toBe(false);
  });

  it("rejects PENDING_VERIFICATION → CANCELLED", () => {
    expect(validateTransition(OrderStatus.PENDING_VERIFICATION, OrderStatus.CANCELLED)).toBe(false);
  });
});

describe("formatOrderStatus", () => {
  it("returns Thai labels for all statuses", () => {
    expect(formatOrderStatus(OrderStatus.PENDING_PAYMENT)).toBe("รอชำระเงิน");
    expect(formatOrderStatus(OrderStatus.PENDING_VERIFICATION)).toBe("รอตรวจสอบ");
    expect(formatOrderStatus(OrderStatus.APPROVED)).toBe("อนุมัติแล้ว");
    expect(formatOrderStatus(OrderStatus.REJECTED)).toBe("ปฏิเสธ");
    expect(formatOrderStatus(OrderStatus.EXPIRED)).toBe("หมดอายุ");
    expect(formatOrderStatus(OrderStatus.CANCELLED)).toBe("ยกเลิก");
  });
});

describe("getOrderStatusVariant", () => {
  it("returns correct badge variants", () => {
    expect(getOrderStatusVariant(OrderStatus.APPROVED)).toBe("default");
    expect(getOrderStatusVariant(OrderStatus.REJECTED)).toBe("destructive");
    expect(getOrderStatusVariant(OrderStatus.PENDING_PAYMENT)).toBe("secondary");
    expect(getOrderStatusVariant(OrderStatus.PENDING_VERIFICATION)).toBe("outline");
  });
});

describe("formatPriceTHB", () => {
  it("formats zero as ฿0.00", () => {
    expect(formatPriceTHB(0)).toBe("฿0.00");
  });

  it("formats 100 satang as ฿1.00", () => {
    expect(formatPriceTHB(100)).toBe("฿1.00");
  });

  it("formats 149000 satang as ฿1,490.00", () => {
    expect(formatPriceTHB(149000)).toBe("฿1,490.00");
  });

  it("formats 50 satang as ฿0.50", () => {
    expect(formatPriceTHB(50)).toBe("฿0.50");
  });

  it("always shows 2 decimal places", () => {
    const result = formatPriceTHB(10000);
    expect(result).toMatch(/\.\d{2}$/);
  });
});

describe("generateOrderNumber", () => {
  it("starts with ORD-", () => {
    expect(generateOrderNumber()).toMatch(/^ORD-/);
  });

  it("contains date segment YYYYMMDD", () => {
    const num = generateOrderNumber();
    const dateSegment = num.split("-")[1];
    expect(dateSegment).toMatch(/^\d{8}$/);
  });

  it("has 8-char hex random suffix", () => {
    const num = generateOrderNumber();
    const rand = num.split("-")[2];
    expect(rand).toMatch(/^[0-9A-F]{8}$/);
  });

  it("generates unique numbers", () => {
    const numbers = new Set(Array.from({ length: 100 }, () => generateOrderNumber()));
    expect(numbers.size).toBe(100);
  });
});
