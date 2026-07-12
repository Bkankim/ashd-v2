import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFieldsWithRules, parseDate } from "./rule";

test("parseDate: strict formats only", () => {
  assert.equal(parseDate("2026-03-15"), "2026-03-15");
  assert.equal(parseDate("2026.03.15"), "2026-03-15");
  assert.equal(parseDate("2026/03/15"), "2026-03-15");
  assert.equal(parseDate("20260315"), "2026-03-15");
  assert.equal(parseDate("2026년 3월"), undefined);
  assert.equal(parseDate("2027-13-40"), undefined);
});

test("parseDate: calendar-invalid dates rejected (no Date rollover)", () => {
  assert.equal(parseDate("2026-02-31"), undefined);
  assert.equal(parseDate("2026-04-31"), undefined);
  assert.equal(parseDate("2026-02-29"), undefined); // 2026 is not a leap year
  assert.equal(parseDate("2028-02-29"), "2028-02-29"); // 2028 is
});

test("keyword-labeled receipt: store/date/amount via labels", () => {
  const fields = extractFieldsWithRules(
    "상호: 올리브영 신촌점\n2026.10.05\n선크림 SPF50\n결제금액 18,000원",
  );
  assert.equal(fields.store, "올리브영 신촌점");
  assert.equal(fields.purchase_date, "2026-10-05");
  assert.equal(fields.amount, 18000);
});

test("brand-pattern store + POS slash date + 결제대상금액", () => {
  const fields = extractFieldsWithRules(
    "홈플러스 강남점\n사업자 123-45-67890\n2026-03-15 14:23:01\n상품명: 신라면 멀티팩\n결제대상금액: 12,800원",
  );
  assert.equal(fields.store, "홈플러스 강남점");
  assert.equal(fields.purchase_date, "2026-03-15");
  assert.equal(fields.amount, 12800);
  assert.equal(fields.title, "신라면 멀티팩");
});

test("Korean-worded date and 합계", () => {
  const fields = extractFieldsWithRules("GS25 역삼점\n2026년 4월 2일\n바나나우유 1,400\n합 계 1,400원");
  assert.equal(fields.purchase_date, "2026-04-02");
  assert.equal(fields.amount, 1400);
});

test("refund inference: 30일 이내 from purchase date", () => {
  const fields = extractFieldsWithRules("2026-01-10\n구매 후 30일 이내 환불 가능\n합계 5,000원");
  assert.equal(fields.purchase_date, "2026-01-10");
  assert.equal(fields.refund_deadline, "2026-02-09");
});

test("category inference from keywords", () => {
  const fields = extractFieldsWithRules("스타벅스 코엑스점\n2026/05/20\n아메리카노 T\n결제금액 4,500원");
  assert.equal(fields.product_category, "카페/음료");
});
