/**
 * W1 measure-first instrumentation sink (single convention).
 *
 * Edge- and RSC-safe (uses only console + process.env, no Node-only APIs) so it works in
 * middleware (Edge), Server Components, and the client — unlike the pino-pretty logger,
 * whose worker thread crashes under RSC/Turbopack. pino stays the logger for Node route handlers.
 *
 * OFF in production by default so prod logs are not spammed; opt in for a measurement window via
 * ASHD_PERF_LOG=1 (server) or NEXT_PUBLIC_ASHD_PERF_LOG=1 (client). Always on in non-prod.
 */
const PERF_LOG_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.ASHD_PERF_LOG === "1" ||
  process.env.NEXT_PUBLIC_ASHD_PERF_LOG === "1";

export function perfLog(
  tag: string,
  fields: Record<string, string | number | boolean>,
): void {
  if (!PERF_LOG_ENABLED) return;
  const parts = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  console.info(`[${tag}] ${parts}`);
}
