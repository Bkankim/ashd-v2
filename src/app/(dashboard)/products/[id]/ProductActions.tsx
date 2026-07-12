"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteProduct } from "@/app/actions/product";
import { Button, buttonVariants } from "@/components/ui/button";

export function ProductActions({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("정말 삭제하시겠습니까? 연결된 문서도 함께 삭제됩니다.")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteProduct(productId);
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Link
        href={`/products/${productId}/edit`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        수정
      </Link>
      <Button
        onClick={handleDelete}
        disabled={isPending}
        variant="destructive"
        size="sm"
      >
        {isPending ? "삭제 중..." : "삭제"}
      </Button>
    </div>
  );
}
