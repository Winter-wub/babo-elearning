import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackPurchase,
  trackPurchaseConfirmed,
  trackSlipUploaded,
} from "../gtm";

const mockProduct = {
  id: "prod_1",
  priceSatang: 149000,
  salePriceSatang: null,
  playlist: { title: "Basic English" },
};

const mockSaleProduct = {
  id: "prod_2",
  priceSatang: 249000,
  salePriceSatang: 199000,
  playlist: { title: "Advanced Course" },
};

describe("GTM tracking", () => {
  let dataLayer: Record<string, unknown>[];

  beforeEach(() => {
    dataLayer = [];
    (globalThis as any).window = { dataLayer };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  it("trackAddToCart pushes correct event", () => {
    trackAddToCart(mockProduct);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({
      event: "add_to_cart",
      currency: "THB",
      value: 1490,
      items: [{ item_id: "prod_1", item_name: "Basic English", price: 1490, quantity: 1 }],
    });
  });

  it("trackAddToCart uses sale price when available", () => {
    trackAddToCart(mockSaleProduct);
    expect(dataLayer[0]).toMatchObject({
      value: 1990,
      items: [{ price: 1990 }],
    });
  });

  it("trackRemoveFromCart pushes correct event", () => {
    trackRemoveFromCart(mockProduct);
    expect(dataLayer[0]).toMatchObject({ event: "remove_from_cart" });
  });

  it("trackViewCart pushes items and total", () => {
    trackViewCart([mockProduct, mockSaleProduct], 348000);
    expect(dataLayer[0]).toMatchObject({
      event: "view_cart",
      value: 3480,
      items: expect.arrayContaining([
        expect.objectContaining({ item_id: "prod_1" }),
        expect.objectContaining({ item_id: "prod_2" }),
      ]),
    });
  });

  it("trackBeginCheckout pushes correct event", () => {
    trackBeginCheckout([mockProduct], 149000);
    expect(dataLayer[0]).toMatchObject({ event: "begin_checkout", currency: "THB" });
  });

  it("trackPurchase fires once per orderId", () => {
    trackPurchase("order_123", [{ item_id: "p1", item_name: "Test", price: 100, quantity: 1, item_category: "course" }], 10000);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({ event: "purchase", transaction_id: "order_123" });

    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("1");
    trackPurchase("order_123", [], 0);
    expect(dataLayer).toHaveLength(1);
  });

  it("trackPurchaseConfirmed fires with correct event name", () => {
    trackPurchaseConfirmed("order_789", [{ item_id: "p1", item_name: "Test", price: 100, quantity: 1, item_category: "course" }], 10000);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({ event: "purchase_confirmed", transaction_id: "order_789", currency: "THB", value: 100 });
  });

  it("trackPurchaseConfirmed deduplicates by orderId", () => {
    trackPurchaseConfirmed("order_789", [{ item_id: "p1", item_name: "Test", price: 100, quantity: 1, item_category: "course" }], 10000);
    expect(dataLayer).toHaveLength(1);

    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("1");
    trackPurchaseConfirmed("order_789", [], 0);
    expect(dataLayer).toHaveLength(1);
  });

  it("trackSlipUploaded pushes custom event", () => {
    trackSlipUploaded("order_456");
    expect(dataLayer[0]).toMatchObject({ event: "slip_uploaded", order_id: "order_456" });
  });
});
