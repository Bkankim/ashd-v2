"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productCreateSchema, productUpdateSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("actions/product");

export interface ProductActionState {
  message: string;
  errors?: Record<string, string[]>;
}

export async function createProduct(
  prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  const raw = {
    title: formData.get("title"),
    product_category: formData.get("product_category") || null,
    purchase_date: formData.get("purchase_date") || null,
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    store: formData.get("store") || null,
    order_id: formData.get("order_id") || null,
    refund_deadline: formData.get("refund_deadline") || null,
    warranty_end_date: formData.get("warranty_end_date") || null,
    as_contact: formData.get("as_contact") || null,
  };

  const parsed = productCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "입력값을 확인해주세요",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("product")
    .insert({
      user_id: user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    log.error({ err: error }, "Product create failed");
    return { message: `저장 실패: ${error.message}` };
  }

  log.info({ title: parsed.data.title }, "Product created");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/products");
}

export async function updateProduct(
  prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  const productId = formData.get("id") as string;
  if (!productId) {
    return { message: "제품 ID가 필요합니다" };
  }

  const raw = {
    title: formData.get("title"),
    product_category: formData.get("product_category") || null,
    purchase_date: formData.get("purchase_date") || null,
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    store: formData.get("store") || null,
    order_id: formData.get("order_id") || null,
    refund_deadline: formData.get("refund_deadline") || null,
    warranty_end_date: formData.get("warranty_end_date") || null,
    as_contact: formData.get("as_contact") || null,
  };

  const parsed = productUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "입력값을 확인해주세요",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("product")
    .update(parsed.data)
    .eq("id", productId);

  if (error) {
    log.error({ err: error, productId }, "Product update failed");
    return { message: `수정 실패: ${error.message}` };
  }

  log.info({ productId }, "Product updated");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect(`/products/${productId}`);
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { error } = await supabase
    .from("product")
    .delete()
    .eq("id", productId);

  if (error) {
    log.error({ err: error, productId }, "Product delete failed");
    return { error: `삭제 실패: ${error.message}` };
  }

  log.info({ productId }, "Product deleted");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/products");
}
