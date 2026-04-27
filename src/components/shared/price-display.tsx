import { Badge } from "@/components/ui/badge";
import { formatPriceTHB } from "@/lib/order-utils";

interface PriceDisplayProps {
  priceSatang: number;
  salePriceSatang?: number | null;
  className?: string;
}

export function PriceDisplay({ priceSatang, salePriceSatang, className }: PriceDisplayProps) {
  if (priceSatang === 0) {
    return <Badge variant="secondary">ฟรี</Badge>;
  }

  if (salePriceSatang != null && salePriceSatang < priceSatang) {
    return (
      <div className={className}>
        <span className="text-sm text-muted-foreground line-through">{formatPriceTHB(priceSatang)}</span>
        <span className="ml-1.5 font-semibold text-primary">{formatPriceTHB(salePriceSatang)}</span>
      </div>
    );
  }

  return <span className={`font-semibold text-primary ${className ?? ""}`}>{formatPriceTHB(priceSatang)}</span>;
}
