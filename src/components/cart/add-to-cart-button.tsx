"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addToCart } from "@/actions/cart.actions";
import { trackAddToCart } from "@/lib/gtm";

interface AddToCartButtonProps {
  productId: string;
  isInCart?: boolean;
  className?: string;
}

export function AddToCartButton({ productId, isInCart = false, className }: AddToCartButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [added, setAdded] = React.useState(isInCart);
  const [isPending, startTransition] = React.useTransition();

  function handleClick() {
    if (added) {
      router.push("/cart");
      return;
    }

    startTransition(async () => {
      const result = await addToCart(productId);
      if (result.success) {
        setAdded(true);
        trackAddToCart(result.data);
        toast({ title: "เพิ่มลงตะกร้าแล้ว" });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
      }
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={added ? "outline" : "default"}
      className={className}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : added ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <ShoppingCart className="mr-2 h-4 w-4" />
      )}
      {added ? "อยู่ในตะกร้าแล้ว" : "เพิ่มลงตะกร้า"}
    </Button>
  );
}
