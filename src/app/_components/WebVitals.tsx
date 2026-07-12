"use client";

import { useReportWebVitals } from "next/web-vitals";
import { perfLog } from "@/lib/perf-log";

/**
 * W1 instrumentation (measure-first): reports client Web Vitals so Phase-1
 * before/after deltas (esp. LCP/TTFB) can be measured. Pure logging, no behavior change.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (["LCP", "TTFB", "FCP", "CLS", "INP"].includes(metric.name)) {
      perfLog("web-vitals", { name: metric.name, value: Math.round(metric.value), id: metric.id });
    }
  });
  return null;
}
