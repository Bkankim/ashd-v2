/**
 * KST (Asia/Seoul, fixed UTC+9, no DST) date helpers.
 * Single source of truth for all KST day-boundary logic
 * (daily-alerts window, job quota, deadline math). TZ-independent:
 * never relies on the process-local timezone.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Current date in KST as YYYY-MM-DD. */
export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant at which the current KST calendar day started. */
export function kstDayStartUtc(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

/**
 * Whole days from today (KST) until a YYYY-MM-DD deadline.
 * 0 = due today, negative = past deadline.
 */
export function daysLeftKst(deadline: string, now: Date = new Date()): number {
  const today = Date.parse(`${kstToday(now)}T00:00:00Z`);
  const target = Date.parse(`${deadline}T00:00:00Z`);
  return Math.round((target - today) / DAY_MS);
}

/** YYYY-MM-DD that is `days` after today (KST). */
export function kstDatePlusDays(days: number, now: Date = new Date()): string {
  const today = Date.parse(`${kstToday(now)}T00:00:00Z`);
  return new Date(today + days * DAY_MS).toISOString().slice(0, 10);
}
