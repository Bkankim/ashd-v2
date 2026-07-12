import { Shield, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { getWarrantyStatus, getRefundStatus } from "@/components/StatusBadge";
interface SummaryProduct {
  warranty_end_date: string | null;
  refund_deadline: string | null;
}

interface SummaryCardsProps {
  products: SummaryProduct[];
}

export function SummaryCards({ products }: SummaryCardsProps) {
  let warrantyExpiring = 0;
  let refundExpiring = 0;

  for (const p of products) {
    if (getWarrantyStatus(p.warranty_end_date).status === "warning") warrantyExpiring++;
    if (getRefundStatus(p.refund_deadline).status === "warning") refundExpiring++;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <SummaryCard
        icon={<Shield className="h-5 w-5 text-primary" />}
        label="전체 제품"
        value={products.length}
        bgClass="bg-accent"
      />
      <SummaryCard
        icon={<AlertTriangle className="h-5 w-5 text-warning" />}
        label="보증 임박"
        value={warrantyExpiring}
        bgClass="bg-warning/10"
      />
      <SummaryCard
        icon={<Clock className="h-5 w-5 text-destructive" />}
        label="환불 임박"
        value={refundExpiring}
        bgClass="bg-destructive/10"
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgClass: string;
}) {
  return (
    <Card className={cn("card-shadow border-border/50", bgClass)}>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        {icon}
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
