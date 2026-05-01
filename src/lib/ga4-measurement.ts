const GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect";

interface ServerPurchaseParams {
  orderId: string;
  orderNumber: string;
  userId: string;
  gaClientId?: string | null;
  gaSessionId?: string | null;
  totalSatang: number;
  items: Array<{
    productId: string;
    snapshotTitle: string;
    snapshotPriceSatang: number;
  }>;
}

export async function trackServerPurchase(params: ServerPurchaseParams): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    return;
  }

  const url = `${GA4_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  const eventParams: Record<string, unknown> = {
    transaction_id: params.orderId,
    currency: "THB",
    value: params.totalSatang / 100,
    items: params.items.map((item) => ({
      item_id: item.productId,
      item_name: item.snapshotTitle,
      price: item.snapshotPriceSatang / 100,
      quantity: 1,
      item_category: "course",
    })),
  };

  if (params.gaSessionId) {
    eventParams.session_id = params.gaSessionId;
  }

  const body = {
    client_id: params.gaClientId || params.userId,
    events: [{ name: "purchase", params: eventParams }],
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[GA4 MP] Failed to track purchase:", err);
  }
}
