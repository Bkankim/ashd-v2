import Link from "next/link";
import { Package } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/ProductCard";
import { perfLog } from "@/lib/perf-log";

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();

  // TODO: Add pagination UI — .limit(20) prevents unbounded growth but users with 21+ products cannot access older items yet
  // W1: instrument RSC query latency + row count for before/after measurement.
  const qStart = performance.now();
  const { data: products, error } = await supabase
    .from("product")
    .select("id, title, store, purchase_date, amount, refund_deadline, warranty_end_date")
    .order("created_at", { ascending: false })
    .limit(20);
  perfLog("rsc-query", { page: "products", rows: products?.length ?? 0, ms: Math.round((performance.now() - qStart) * 100) / 100 });

  if (error) throw error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">제품 목록</h1>
        <div className="flex gap-2">
          <Link
            href="/products/new"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-all"
          >
            수동 등록
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-2.5 h-7 text-[0.8rem] font-medium hover:bg-primary/80 transition-all"
          >
            새 업로드
          </Link>
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="space-y-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">등록된 제품이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
