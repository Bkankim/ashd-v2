import Link from "next/link";
import { Package } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/SummaryCards";
import { ProductCard } from "@/components/ProductCard";
import { perfLog } from "@/lib/perf-log";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // W1: instrument RSC query latency + row count for before/after measurement.
  const qStart = performance.now();
  const { data: products, error } = await supabase
    .from("product")
    .select("id, title, store, purchase_date, amount, refund_deadline, warranty_end_date")
    .order("created_at", { ascending: false })
    .limit(100);
  perfLog("rsc-query", { page: "dashboard", rows: products?.length ?? 0, ms: Math.round((performance.now() - qStart) * 100) / 100 });

  if (error) throw new Error(`[${error.code}] ${error.message}`);

  return (
    <div className="space-y-6">
      <SummaryCards products={products ?? []} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">최근 등록 제품</h2>
        {products && products.length > 0 ? (
          <div className="space-y-3">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {products.length > 10 && (
              <div className="text-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-all"
                >
                  전체 보기
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">등록된 제품이 없습니다.</p>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
            >
              영수증 업로드하기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
