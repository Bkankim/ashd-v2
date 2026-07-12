import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isStalledJob,
  exceedsDailyQuota,
  STALL_THRESHOLD_MS,
  DAILY_JOB_QUOTA,
} from "./job-policies";

const NOW = new Date("2026-07-04T12:00:00Z");

test("isStalledJob: exactly at threshold is not stalled, past it is", () => {
  const atThreshold = new Date(NOW.getTime() - STALL_THRESHOLD_MS).toISOString();
  const past = new Date(NOW.getTime() - STALL_THRESHOLD_MS - 1000).toISOString();
  assert.equal(isStalledJob(atThreshold, NOW), false);
  assert.equal(isStalledJob(past, NOW), true);
});

test("isStalledJob: fresh job is not stalled", () => {
  assert.equal(isStalledJob(new Date(NOW.getTime() - 60_000).toISOString(), NOW), false);
});

test("isStalledJob: unparseable timestamp is never stalled", () => {
  assert.equal(isStalledJob("not-a-date", NOW), false);
});

test("exceedsDailyQuota: 29/30/31 boundary", () => {
  assert.equal(exceedsDailyQuota(DAILY_JOB_QUOTA - 1), false);
  assert.equal(exceedsDailyQuota(DAILY_JOB_QUOTA), true);
  assert.equal(exceedsDailyQuota(DAILY_JOB_QUOTA + 1), true);
});
