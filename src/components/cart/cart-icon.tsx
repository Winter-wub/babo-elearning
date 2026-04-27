"use client";

import * as React from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCartItemCount } from "@/actions/cart.actions";

interface CartIconProps {
  onClick: () => void;
}

export function CartIcon({ onClick }: CartIconProps) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    getCartItemCount().then(setCount);
  }, []);

  // Re-fetch count periodically (every 30s) to stay in sync
  React.useEffect(() => {
    const interval = setInterval(() => {
      getCartItemCount().then(setCount);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="ตะกร้าสินค้า"
      className="relative"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );
}
