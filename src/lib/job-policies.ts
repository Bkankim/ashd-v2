/**
 * Pure policy predicates for document-processing jobs.
 * Kept side-effect free so boundaries are unit-testable (ralplan DR-8).
 */

/** Jobs stuck in pending/processing longer than this are considered stalled. */
export const STALL_THRESHOLD_MS = 15 * 60 * 1000;

/** Maximum document-processing jobs a user may create per KST day. */
export const DAILY_JOB_QUOTA = 30;

/** True when a job created at `createdAt` (ISO string) has stalled as of `now`. */
export function isStalledJob(createdAt: string, now: Date = new Date()): boolean {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return now.getTime() - created > STALL_THRESHOLD_MS;
}

/** True when `count` jobs already created today (KST) exhaust the daily quota. */
export function exceedsDailyQuota(count: number): boolean {
  return count >= DAILY_JOB_QUOTA;
}
