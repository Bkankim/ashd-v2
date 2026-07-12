import Link from "next/link";
import { Store, Calendar, ChevronRight } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, getWarrantyStatus, getRefundStatus } from "@/components/StatusBadge";
interface ProductCardProduct {
  id: string;
  title: string;
  store: string | null;
  purchase_date: string | null;
  amount: number | null;
  warranty_end_date: string | null;
  refund_deadline: string | null;
}

interface ProductCardProps {
  product: ProductCardProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const warranty = getWarrantyStatus(product.warranty_end_date);
  const refund = getRefundStatus(product.refund_deadline);

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="card-shadow border-border/50 transition-shadow hover:card-shadow-lg active:scale-[0.98]">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate font-medium">{product.title}</p>

            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={warranty.status} label={warranty.label} />
              <StatusBadge status={refund.status} label={refund.label} />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {product.store && (
                <span className="flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  {product.store}
                </span>
              )}
              {product.purchase_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {product.purchase_date}
                </span>
              )}
            </div>

            {product.amount !== null && (
              <p className="text-sm font-semibold text-primary">
                {formatKRW(Number(product.amount))}
              </p>
            )}
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
