type GtmItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category: string;
};

function pushEvent(event: string, data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...data });
}

function toGtmItem(product: { id: string; priceSatang: number; salePriceSatang?: number | null; playlist: { title: string } }): GtmItem {
  return {
    item_id: product.id,
    item_name: product.playlist.title,
    price: (product.salePriceSatang ?? product.priceSatang) / 100,
    quantity: 1,
    item_category: "course",
  };
}

export function trackAddToCart(product: Parameters<typeof toGtmItem>[0]) {
  const item = toGtmItem(product);
  pushEvent("add_to_cart", { currency: "THB", value: item.price, items: [item] });
}

export function trackRemoveFromCart(product: Parameters<typeof toGtmItem>[0]) {
  const item = toGtmItem(product);
  pushEvent("remove_from_cart", { currency: "THB", value: item.price, items: [item] });
}

export function trackViewCart(items: Parameters<typeof toGtmItem>[0][], totalSatang: number) {
  pushEvent("view_cart", {
    currency: "THB",
    value: totalSatang / 100,
    items: items.map(toGtmItem),
  });
}

export function trackBeginCheckout(items: Parameters<typeof toGtmItem>[0][], totalSatang: number) {
  pushEvent("begin_checkout", {
    currency: "THB",
    value: totalSatang / 100,
    items: items.map(toGtmItem),
  });
}

export function trackPurchase(orderId: string, items: GtmItem[], totalSatang: number) {
  if (typeof window === "undefined") return;
  const key = `purchase_fired_${orderId}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");

  pushEvent("purchase", {
    transaction_id: orderId,
    currency: "THB",
    value: totalSatang / 100,
    items,
  });
}

export function trackPurchaseConfirmed(orderId: string, items: GtmItem[], totalSatang: number, metaEventId?: string | null) {
  if (typeof window === "undefined") return;
  const key = `purchase_confirmed_fired_${orderId}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "1");

  pushEvent("purchase_confirmed", {
    transaction_id: orderId,
    currency: "THB",
    value: totalSatang / 100,
    items,
    ...(metaEventId ? { meta_event_id: metaEventId } : {}),
  });
}

export function trackSlipUploaded(orderId: string) {
  pushEvent("slip_uploaded", { order_id: orderId, event_category: "checkout" });
}
