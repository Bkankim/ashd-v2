import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAlerts, type SentRecord } from "./select-alerts";

const product = {
  id: "p1",
  title: "냉장고",
  warranty_end_date: "2026-07-10",
  refund_deadline: null,
};

function run(daysLeft: number, sent: SentRecord[] = [], thresholds = [30, 7, 3]) {
  return selectAlerts({
    products: [product],
    warrantyDaysBefore: thresholds,
    refundDaysBefore: [3],
    sent,
    channel: "email",
    daysLeftOf: () => daysLeft,
  });
}

test("AC7(a): two consecutive runs produce zero duplicates", () => {
  // First-ever run at daysLeft=7: thresholds 30 and 7 are both already due
  // (t >= daysLeft) and get folded into one alert per DR-2.
  const day1 = run(7);
  assert.equal(day1.length, 1);
  assert.deepEqual(day1[0]?.thresholds, [7, 30]);

  // Simulate day 2 (daysLeft=6) with day-1 thresholds logged
  const sent: SentRecord[] = [
    { product_id: "p1", type: "warranty", threshold_days: 7, channel: "email" },
    { product_id: "p1", type: "warranty", threshold_days: 30, channel: "email" },
  ];
  const day2 = run(6, sent);
  assert.equal(day2.length, 0);
});

test("AC7(b): one-day outage is caught up with thresholds folded into one alert", () => {
  // Thresholds 7 and 3. Cron dead at daysLeft=3; runs again at daysLeft=2.
  const sent: SentRecord[] = [
    { product_id: "p1", type: "warranty", threshold_days: 30, channel: "email" },
    { product_id: "p1", type: "warranty", threshold_days: 7, channel: "email" },
  ];
  const actions = run(2, sent);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0]?.thresholds, [3]); // missed threshold recovered
  assert.equal(actions[0]?.daysLeft, 2);
});

test("AC7(c): D-0 is eligible", () => {
  const actions = run(0);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0]?.thresholds, [3, 7, 30]); // all folded, logged once each
});

test("AC7(d): past deadline never fires", () => {
  assert.equal(run(-1).length, 0);
});

test("channel isolation: telegram log does not suppress email", () => {
  const sent: SentRecord[] = [
    { product_id: "p1", type: "warranty", threshold_days: 7, channel: "telegram" },
    { product_id: "p1", type: "warranty", threshold_days: 30, channel: "telegram" },
  ];
  const actions = run(7, sent);
  assert.equal(actions.length, 1);
  assert.deepEqual(actions[0]?.thresholds, [7, 30]);
});

test("warranty and refund are tracked independently and sorted by urgency", () => {
  const p = {
    id: "p2",
    title: "노트북",
    warranty_end_date: "2026-08-01",
    refund_deadline: "2026-07-05",
  };
  const actions = selectAlerts({
    products: [p],
    warrantyDaysBefore: [30],
    refundDaysBefore: [3],
    sent: [],
    channel: "email",
    daysLeftOf: (d) => (d === "2026-08-01" ? 28 : 1),
  });
  assert.equal(actions.length, 2);
  assert.equal(actions[0]?.type, "refund"); // daysLeft 1 first
  assert.equal(actions[1]?.type, "warranty");
});
