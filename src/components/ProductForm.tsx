"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createProduct, updateProduct } from "@/app/actions/product";
import type { ProductActionState } from "@/app/actions/product";
import type { Database } from "@/types/database";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type ProductRow = Database["public"]["Tables"]["product"]["Row"];

interface ProductFormProps {
  mode: "create" | "edit";
  product?: ProductRow;
}

const initialState: ProductActionState = { message: "" };

export function ProductForm({ mode, product }: ProductFormProps) {
  const action = mode === "create" ? createProduct : updateProduct;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="card-shadow border-border/50">
      <CardContent className="p-5">
        <form action={formAction} className="space-y-4">
          {mode === "edit" && product && (
            <input type="hidden" name="id" value={product.id} />
          )}

          {state.message && !state.errors && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {state.message}
            </p>
          )}

          <Field
            label="제목"
            name="title"
            required
            defaultValue={product?.title ?? ""}
            error={state.errors?.title}
          />
          <Field
            label="카테고리"
            name="product_category"
            defaultValue={product?.product_category ?? ""}
          />
          <Field
            label="구매일"
            name="purchase_date"
            type="date"
            defaultValue={product?.purchase_date ?? ""}
          />
          <Field
            label="금액"
            name="amount"
            type="number"
            defaultValue={product?.amount?.toString() ?? ""}
          />
          <Field
            label="매장"
            name="store"
            defaultValue={product?.store ?? ""}
          />
          <Field
            label="주문번호"
            name="order_id"
            defaultValue={product?.order_id ?? ""}
          />
          <Field
            label="환불 마감일"
            name="refund_deadline"
            type="date"
            defaultValue={product?.refund_deadline ?? ""}
          />
          <Field
            label="보증 만료일"
            name="warranty_end_date"
            type="date"
            defaultValue={product?.warranty_end_date ?? ""}
          />
          <Field
            label="AS 연락처"
            name="as_contact"
            defaultValue={product?.as_contact ?? ""}
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "저장 중..."
                : mode === "create"
                  ? "등록"
                  : "저장"}
            </Button>
            <Link
              href={
                mode === "edit" && product
                  ? `/products/${product.id}`
                  : "/products"
              }
              className={buttonVariants({ variant: "outline" })}
            >
              취소
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
      />
      {error && (
        <p className="text-xs text-destructive">{error[0]}</p>
      )}
    </div>
  );
}
