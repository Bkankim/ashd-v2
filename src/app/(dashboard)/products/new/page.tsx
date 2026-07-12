import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/products"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        뒤로
      </Link>
      <h1 className="text-lg font-bold">제품 수동 등록</h1>
      <ProductForm mode="create" />
    </div>
  );
}
