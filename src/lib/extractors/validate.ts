/**
 * Post-extraction sanitation for merged rule+LLM fields.
 *
 * The rule extractor already normalizes its own output, but LLM output is
 * only type-checked (string/number), so date strings like "2026년 3월" or
 * absurd amounts would otherwise flow into Postgres `date`/`numeric` columns,
 * fail the insert, and (before hardening) silently strand the job.
 * Invalid fields are dropped, never fatal.
 */

import { parseDate, type ExtractedFields } from "./rule";

const MAX_TEXT_LENGTH = 255;
const MAX_AMOUNT = 1_000_000_000; // 10억원 상한 — 영수증 도메인 밖 값 차단

const DATE_FIELDS = ["purchase_date", "refund_deadline", "warranty_end_date"] as const;
const TEXT_FIELDS = ["title", "product_category", "store", "order_id", "as_contact"] as const;

function sanitizeText(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_TEXT_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeDate(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  return parseDate(value.trim());
}

function sanitizeAmount(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.trunc(value);
  if (n <= 0 || n > MAX_AMOUNT) return undefined;
  return n;
}

export function sanitizeExtractedFields(fields: ExtractedFields): ExtractedFields {
  const out: ExtractedFields = {};

  for (const key of TEXT_FIELDS) {
    const v = sanitizeText(fields[key]);
    if (v !== undefined) out[key] = v;
  }
  for (const key of DATE_FIELDS) {
    const v = sanitizeDate(fields[key]);
    if (v !== undefined) out[key] = v;
  }
  const amount = sanitizeAmount(fields.amount);
  if (amount !== undefined) out.amount = amount;
  if (fields.source !== undefined) out.source = fields.source;

  return out;
}
