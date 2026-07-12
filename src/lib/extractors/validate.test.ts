import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeExtractedFields } from "./validate";

test("drops LLM date strings that are not strict YYYY-MM-DD", () => {
  const out = sanitizeExtractedFields({
    purchase_date: "2026년 3월",
    refund_deadline: "next month",
    warranty_end_date: "2027-13-40",
  });
  assert.equal(out.purchase_date, undefined);
  assert.equal(out.refund_deadline, undefined);
  assert.equal(out.warranty_end_date, undefined);
});

test("keeps valid dates in every supported format", () => {
  const out = sanitizeExtractedFields({
    purchase_date: "2026-03-15",
    refund_deadline: "2026.04.01",
    warranty_end_date: "2027/03/15",
  });
  assert.equal(out.purchase_date, "2026-03-15");
  assert.equal(out.refund_deadline, "2026-04-01");
  assert.equal(out.warranty_end_date, "2027-03-15");
});

test("amount: drops non-positive, non-finite, absurd; truncates decimals", () => {
  assert.equal(sanitizeExtractedFields({ amount: -100 }).amount, undefined);
  assert.equal(sanitizeExtractedFields({ amount: 0 }).amount, undefined);
  assert.equal(sanitizeExtractedFields({ amount: NaN }).amount, undefined);
  assert.equal(sanitizeExtractedFields({ amount: 2_000_000_000 }).amount, undefined);
  assert.equal(sanitizeExtractedFields({ amount: 12800.9 }).amount, 12800);
});

test("text fields: trims, drops empty, caps at 255 chars", () => {
  const out = sanitizeExtractedFields({
    title: `  ${"가".repeat(300)}  `,
    store: "   ",
  });
  assert.equal(out.title?.length, 255);
  assert.equal(out.store, undefined);
});

test("source passes through untouched", () => {
  assert.equal(sanitizeExtractedFields({ source: "screenshot" }).source, "screenshot");
});
