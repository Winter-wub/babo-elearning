import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCart } from "@/actions/cart.actions";
import { CheckoutContent } from "@/components/checkout/checkout-content";

export const metadata: Metadata = {
  title: "ชำระเงิน",
};

export default async function CheckoutPage() {
  const result = await getCart();

  if (!result.success || result.data.items.length === 0) {
    redirect("/cart");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <CheckoutContent cart={result.data} />
    </div>
  );
}
