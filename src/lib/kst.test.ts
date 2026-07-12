import { test } from "node:test";
import assert from "node:assert/strict";
import { kstToday, kstDayStartUtc, daysLeftKst, kstDatePlusDays } from "./kst";

// All fixtures use explicit UTC instants so tests are TZ-independent.

test("kstToday: UTC afternoon is same KST day", () => {
  assert.equal(kstToday(new Date("2026-07-04T14:59:59Z")), "2026-07-04");
});

test("kstToday: UTC 15:00+ rolls into next KST day", () => {
  assert.equal(kstToday(new Date("2026-07-04T15:00:00Z")), "2026-07-05");
});

test("kstDayStartUtc: KST midnight is 15:00 UTC previous day", () => {
  const start = kstDayStartUtc(new Date("2026-07-04T14:00:00Z")); // KST 2026-07-04 23:00
  assert.equal(start.toISOString(), "2026-07-03T15:00:00.000Z");
});

test("kstDayStartUtc: just after KST midnight", () => {
  const start = kstDayStartUtc(new Date("2026-07-04T15:30:00Z")); // KST 2026-07-05 00:30
  assert.equal(start.toISOString(), "2026-07-04T15:00:00.000Z");
});

test("daysLeftKst: due today is 0", () => {
  assert.equal(daysLeftKst("2026-07-04", new Date("2026-07-04T00:00:05Z")), 0);
});

test("daysLeftKst: future and past deadlines", () => {
  const now = new Date("2026-07-04T00:00:05Z"); // KST 2026-07-04 09:00
  assert.equal(daysLeftKst("2026-07-07", now), 3);
  assert.equal(daysLeftKst("2026-07-03", now), -1);
});

test("daysLeftKst: KST day rollover changes the answer", () => {
  assert.equal(daysLeftKst("2026-07-05", new Date("2026-07-04T14:59:00Z")), 1);
  assert.equal(daysLeftKst("2026-07-05", new Date("2026-07-04T15:01:00Z")), 0);
});

test("kstDatePlusDays: adds calendar days including month boundary", () => {
  const now = new Date("2026-07-30T00:00:00Z");
  assert.equal(kstDatePlusDays(0, now), "2026-07-30");
  assert.equal(kstDatePlusDays(3, now), "2026-08-02");
});
