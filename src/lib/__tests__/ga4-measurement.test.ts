import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackServerPurchase } from "../ga4-measurement";

const mockParams = {
  orderId: "order_123",
  orderNumber: "ORD-001",
  userId: "user_456",
  totalSatang: 149000,
  items: [
    { productId: "prod_1", snapshotTitle: "Basic English", snapshotPriceSatang: 149000 },
  ],
};

describe("GA4 Measurement Protocol", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GA4_MEASUREMENT_ID;
    delete process.env.GA4_API_SECRET;
  });

  it("returns early when env vars are missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await trackServerPurchase(mockParams);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends correct payload when env vars are set", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.GA4_API_SECRET = "secret_abc";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    await trackServerPurchase(mockParams);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("measurement_id=G-TEST123");
    expect(url).toContain("api_secret=secret_abc");

    const body = JSON.parse(options!.body as string);
    expect(body.client_id).toBe("user_456");
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      name: "purchase",
      params: {
        transaction_id: "order_123",
        currency: "THB",
        value: 1490,
        items: [{ item_id: "prod_1", item_name: "Basic English", price: 1490, quantity: 1, item_category: "course" }],
      },
    });
  });

  it("uses gaClientId when available for attribution", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.GA4_API_SECRET = "secret_abc";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    await trackServerPurchase({
      ...mockParams,
      gaClientId: "1234567890.1234567890",
      gaSessionId: "1717000000",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.client_id).toBe("1234567890.1234567890");
    expect(body.events[0].params.session_id).toBe("1717000000");
  });

  it("falls back to userId when gaClientId is null", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.GA4_API_SECRET = "secret_abc";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    await trackServerPurchase({ ...mockParams, gaClientId: null, gaSessionId: null });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.client_id).toBe("user_456");
    expect(body.events[0].params.session_id).toBeUndefined();
  });

  it("handles fetch failure gracefully", async () => {
    process.env.GA4_MEASUREMENT_ID = "G-TEST123";
    process.env.GA4_API_SECRET = "secret_abc";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    await trackServerPurchase(mockParams);
    expect(consoleSpy).toHaveBeenCalledWith("[GA4 MP] Failed to track purchase:", expect.any(Error));
  });
});
