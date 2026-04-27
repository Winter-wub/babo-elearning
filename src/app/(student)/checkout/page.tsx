import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCart } from "@/actions/cart.actions";
import { CHECKOUT_KEYS, CHECKOUT_DEFAULTS } from "@/lib/constants";
import { CheckoutContent } from "@/components/checkout/checkout-content";

export const metadata: Metadata = {
  title: "ชำระเงิน",
};

export default async function CheckoutPage() {
  const result = await getCart();

  if (!result.success || result.data.items.length === 0) {
    redirect("/cart");
  }

  const keys = Object.values(CHECKOUT_KEYS);
  const rows = await db.siteContent.findMany({ where: { key: { in: keys } } });
  const contentMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const bankDetails = {
    bankName: contentMap[CHECKOUT_KEYS.bankName] || CHECKOUT_DEFAULTS.bankName,
    accountNumber: contentMap[CHECKOUT_KEYS.accountNumber] || CHECKOUT_DEFAULTS.accountNumber,
    accountName: contentMap[CHECKOUT_KEYS.accountName] || CHECKOUT_DEFAULTS.accountName,
    promptpayId: contentMap[CHECKOUT_KEYS.promptpayId] || CHECKOUT_DEFAULTS.promptpayId,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <CheckoutContent cart={result.data} bankDetails={bankDetails} />
    </div>
  );
}
