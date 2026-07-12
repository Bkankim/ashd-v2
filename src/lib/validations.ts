import { z } from "zod";

export const sourceEnum = z.enum(["manual", "screenshot", "kakao_share", "email"]);

export const productCreateSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  product_category: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  store: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  refund_deadline: z.string().nullable().optional(),
  warranty_end_date: z.string().nullable().optional(),
  as_contact: z.string().nullable().optional(),
  source: sourceEnum.optional().default("manual"),
});

export const productUpdateSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  product_category: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  store: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  refund_deadline: z.string().nullable().optional(),
  warranty_end_date: z.string().nullable().optional(),
  as_contact: z.string().nullable().optional(),
});

export type ProductFormData = z.infer<typeof productCreateSchema>;
export type ProductUpdateData = z.infer<typeof productUpdateSchema>;

export const notificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  telegram_enabled: z.boolean(),
  warranty_days_before: z.array(z.number().int().positive()),
  refund_days_before: z.array(z.number().int().positive()),
});

export const telegramAccountSchema = z.object({
  chat_id: z.string().min(1, "Chat ID는 필수입니다"),
  username: z.string().nullable().optional(),
});
