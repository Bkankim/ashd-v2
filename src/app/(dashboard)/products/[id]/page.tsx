import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store, Calendar, Hash, Phone, Tag, FileText } from "lucide-react";
import { formatKRW } from "@/lib/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductActions } from "./ProductActions";
import { Card, CardContent } from "@/components/ui/card";
import {
  StatusBadge,
  getWarrantyStatus,
  getRefundStatus,
} from "@/components/StatusBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product, error } = await supabase
    .from("product")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  const warranty = getWarrantyStatus(product.warranty_end_date);
  const refund = getRefundStatus(product.refund_deadline);

  return (
    <div className="space-y-4">
      <Link
        href="/products"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">{product.title}</h1>
          <div className="flex gap-2">
            <StatusBadge status={warranty.status} label={warranty.label} />
            <StatusBadge status={refund.status} label={refund.label} />
          </div>
          {product.amount !== null && (
            <p className="text-lg font-semibold text-primary">
              {formatKRW(Number(product.amount))}
            </p>
          )}
        </div>
        <ProductActions productId={product.id} />
      </div>

      <Card className="card-shadow border-border/50">
        <CardContent className="space-y-4 p-5">
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label="카테고리"
            value={product.product_category}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="구매일"
            value={product.purchase_date}
          />
          <DetailRow
            icon={<Store className="h-4 w-4" />}
            label="매장"
            value={product.store}
          />
          <DetailRow
            icon={<Hash className="h-4 w-4" />}
            label="주문번호"
            value={product.order_id}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="환불 마감일"
            value={product.refund_deadline}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="보증 만료일"
            value={product.warranty_end_date}
          />
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label="AS 연락처"
            value={product.as_contact}
          />
        </CardContent>
      </Card>

      {product.raw_text && (
        <Card className="border-border/50">
          <details className="p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              OCR 추출 원문
            </summary>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              {product.raw_text}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value ?? "-"}</p>
      </div>
    </div>
  );
}
